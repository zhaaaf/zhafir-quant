"""
Quant Finance Result Interpretation
Converts numerical optimization output into human-readable Indonesian explanations.
Targets beginner-to-intermediate traders learning quantitative methods.
"""
import numpy as np
from typing import Optional


def interpret_result(result: dict, model: str,
                     mu: Optional[np.ndarray] = None,
                     rf: float = 0.0) -> dict:
    """
    Generate structured interpretation of portfolio optimization output.
    Returns quality grade, headline, explanations, and concrete suggestions.
    """
    sharpe = float(result.get("sharpe_ratio") or 0)
    ret    = float(result.get("expected_return") or 0)
    vol    = float(result.get("volatility") or 0)
    weights = result.get("weights") or []
    tickers = result.get("tickers") or []
    n       = len(weights)

    messages    : list[str] = []
    suggestions : list[str] = []
    warnings    : list[str] = []

    # ── 1. Sharpe Ratio grading ─────────────────────────────────────
    if sharpe >= 2.0:
        grade   = "A+"
        quality = "excellent"
        messages.append(f"Sharpe Ratio {sharpe:.2f} — sangat optimal. Portofolio ini efisien dan layak dieksekusi.")
    elif sharpe >= 1.5:
        grade   = "A"
        quality = "excellent"
        messages.append(f"Sharpe Ratio {sharpe:.2f} — sangat baik. Return sepadan dengan risiko yang diambil.")
    elif sharpe >= 1.0:
        grade   = "B"
        quality = "good"
        messages.append(f"Sharpe Ratio {sharpe:.2f} — baik. Standar minimum untuk portofolio aktif profesional adalah SR ≥ 1.")
    elif sharpe >= 0.5:
        grade   = "C"
        quality = "fair"
        messages.append(f"Sharpe Ratio {sharpe:.2f} — cukup, tapi masih di bawah target. Coba model lain atau periode berbeda.")
        suggestions.append("Coba ganti ke model RMT (noise-filtered covariance) yang sering memberikan SR lebih tinggi.")
    elif sharpe >= 0:
        grade   = "D"
        quality = "poor"
        warnings.append(f"Sharpe Ratio {sharpe:.2f} — rendah. Return hampir tidak memadai untuk risiko yang ditanggung.")
        suggestions.append("Pertimbangkan menambah saham dengan fundamental lebih kuat atau memperluas universe screener.")
    else:
        grade   = "F"
        quality = "bad"
        warnings.append(f"Sharpe Ratio {sharpe:.2f} — negatif! Return di bawah risk-free rate. Hindari portofolio ini hari ini.")
        suggestions.append("Kondisi pasar sedang tidak kondusif. Tunggu sampai sinyal momentum membaik.")

    # ── 2. Return vs Risk-Free Rate ─────────────────────────────────
    if ret <= rf and ret > 0:
        warnings.append(f"Return {ret*100:.1f}%/tahun lebih rendah dari risk-free rate ({rf*100:.1f}%). "
                        "Lebih baik simpan di deposito.")
    elif ret < 0:
        warnings.append(f"Expected return negatif ({ret*100:.1f}%). Pasar sedang dalam tren turun untuk saham-saham ini.")
        suggestions.append("Tidak disarankan trading saat ini. Tunggu konfirmasi pembalikan tren atau ganti universe saham.")
    else:
        messages.append(f"Return {ret*100:.1f}%/tahun di atas risk-free rate — premi risiko positif.")

    # ── 3. Volatility ───────────────────────────────────────────────
    if vol > 0.35:
        warnings.append(f"Volatilitas {vol*100:.0f}%/tahun sangat tinggi (kategori sangat agresif). "
                        "Dalam satu tahun, portofolio bisa naik atau turun hingga ±{vol*100:.0f}%.")
        suggestions.append("Tambahkan saham defensif (utilities, consumer staples) untuk menurunkan volatilitas.")
    elif vol > 0.25:
        messages.append(f"Volatilitas {vol*100:.0f}%/tahun — tinggi. Cocok untuk swing trader berpengalaman.")
    elif vol > 0.15:
        messages.append(f"Volatilitas {vol*100:.0f}%/tahun — moderat. Sesuai untuk sebagian besar profil risiko.")
    else:
        messages.append(f"Volatilitas {vol*100:.0f}%/tahun — rendah. Cocok untuk investor konservatif.")

    # ── 4. Diversification ──────────────────────────────────────────
    w_arr        = np.array(weights) if weights else np.array([])
    n_active     = int(np.sum(w_arr > 0.02)) if len(w_arr) else 0
    max_w        = float(np.max(w_arr)) if len(w_arr) else 0
    hhi          = float(np.sum(w_arr ** 2)) if len(w_arr) else 1  # Herfindahl index

    if max_w > 0.70:
        warnings.append(f"Konsentrasi sangat tinggi: satu saham mendominasi {max_w*100:.0f}% portofolio. "
                        "Ini bukan diversifikasi — ini taruhan tunggal (single bet).")
        suggestions.append("Batasi bobot maksimum setiap saham di 30-40% untuk manajemen risiko yang baik.")
    elif max_w > 0.50:
        warnings.append(f"Konsentrasi tinggi: saham terbesar {max_w*100:.0f}%. Pertimbangkan menambah ticker.")
    elif n_active <= 2:
        suggestions.append("Hanya 2 saham aktif. Untuk diversifikasi yang baik, minimal 5-8 saham berbeda sektor.")
    else:
        messages.append(f"{n_active} saham aktif dengan diversifikasi memadai (HHI: {hhi:.2f}).")

    # ── 5. Model-specific ───────────────────────────────────────────
    if model == "cvar":
        cvar = result.get("cvar")
        if cvar:
            messages.append(f"CVaR 95%: dalam skenario terburuk 5% hari perdagangan, "
                            f"kerugian harian diperkirakan {cvar*100:.2f}% dari portofolio.")
    elif model == "entropy":
        eff_n = result.get("effective_n")
        if eff_n:
            messages.append(f"Effective N = {eff_n:.1f} (dari {n} saham) — diversifikasi setara {eff_n:.1f} saham dengan bobot sama.")
    elif model == "rmt":
        rmt = result.get("rmt_stats", {})
        if rmt:
            n_noise  = rmt.get("n_noise", 0)
            n_signal = rmt.get("n_signal", 0)
            if n_noise > n_signal:
                messages.append(f"RMT: {n_noise} eigenvalue noise disaring, hanya {n_signal} sinyal genuine yang dipakai. "
                                "Ini meningkatkan akurasi estimasi risiko.")

    # ── 6. Overall trading advice ────────────────────────────────────
    if quality == "excellent":
        action = "LAYAK TRADING"
        action_detail = "Portofolio ini memenuhi standar kuantitatif. Lanjutkan dengan risk management yang ketat."
    elif quality == "good":
        action = "PERTIMBANGKAN"
        action_detail = "Hasil baik tapi perhatikan konsentrasi dan volatilitas sebelum eksekusi."
    elif quality == "fair":
        action = "HATI-HATI"
        action_detail = "Hasil di bawah optimal. Coba parameter berbeda atau tunggu kondisi pasar membaik."
    elif quality == "poor":
        action = "TUNDA DULU"
        action_detail = "Risiko tidak sebanding dengan return. Tidak disarankan untuk eksekusi hari ini."
    else:
        action = "JANGAN TRADING"
        action_detail = "Kondisi portofolio tidak mendukung. Analisis ulang universe saham dan model."

    return {
        "quality":        quality,
        "grade":          grade,
        "action":         action,
        "action_detail":  action_detail,
        "messages":       messages,
        "warnings":       warnings,
        "suggestions":    suggestions,
        "n_active":       n_active,
        "max_weight_pct": round(max_w * 100, 1),
        "hhi":            round(hhi, 3),
        "ret_pct":        round(ret * 100, 2),
        "vol_pct":        round(vol * 100, 2),
        "sharpe":         round(sharpe, 3),
        "grade_color":    {
            "A+": "#9ece6a", "A": "#9ece6a", "B": "#7aa2f7",
            "C": "#e0af68",  "D": "#f7768e", "F": "#f7768e"
        }.get(grade, "#6c7086"),
    }
