/**
 * Parameter help text, suggested values, and quick-fill suggestions
 * for beginner quant traders.
 */
export interface ParamHelp {
  label:       string;
  short:       string;        // one-line tooltip
  detail:      string;        // longer explanation
  suggestions: { label: string; value: string | number; note: string }[];
  learnMore?:  string;        // optional DOI or URL
}

export const PARAM_HELP: Record<string, ParamHelp> = {

  period: {
    label: "Period Data",
    short: "Berapa lama data historis yang digunakan model",
    detail:
      "Model mengambil data harga dari N bulan/tahun terakhir untuk mengestimasi " +
      "return rata-rata dan matriks kovarians. Periode terlalu pendek = noise tinggi. " +
      "Periode terlalu panjang = kondisi pasar sudah berbeda.",
    suggestions: [
      { label: "6 bulan",  value: "6mo", note: "Day trader & scalper" },
      { label: "1 tahun",  value: "1y",  note: "Swing trader (paling umum)" },
      { label: "2 tahun",  value: "2y",  note: "Standar quant profesional" },
      { label: "3 tahun",  value: "3y",  note: "Long-term investor" },
    ],
  },

  risk_free_rate: {
    label: "Risk-Free Rate",
    short: "Return investasi bebas risiko sebagai benchmark (patokan Sharpe Ratio)",
    detail:
      "Sharpe Ratio = (Return Portofolio − Risk-Free Rate) / Volatilitas. " +
      "Semakin tinggi risk-free rate, semakin ketat standar portofolio kamu. " +
      "Gunakan BI Rate (Bank Indonesia) atau yield SBN (Surat Berharga Negara) " +
      "sebagai acuan untuk saham Indonesia.",
    suggestions: [
      { label: "BI Rate saat ini", value: "5.75", note: "5.75% (Juni 2026)" },
      { label: "SBN 10 tahun",     value: "6.5",  note: "±6.5% yield obligasi negara" },
      { label: "Deposito bank",    value: "4.0",   note: "±4% rata-rata deposito" },
      { label: "US T-Bill",        value: "5.3",   note: "Untuk saham US (NYSE/NASDAQ)" },
    ],
  },

  alpha: {
    label: "CVaR α (Confidence Level)",
    short: "Tingkat kepercayaan untuk mengukur risiko ekor (tail risk)",
    detail:
      "CVaR 95% artinya: 'perkiraan kerugian rata-rata dalam 5% hari terburuk'. " +
      "α=0.95 adalah standar industri. Semakin tinggi α (misal 0.99), " +
      "semakin konservatif dan fokus pada skenario ekstrem.",
    suggestions: [
      { label: "95% (standar)",    value: 0.95, note: "Industri: hedge fund, manajer investasi" },
      { label: "99% (konservatif)", value: 0.99, note: "Bank, regulasi Basel III" },
      { label: "90% (longgar)",    value: 0.90, note: "Trader individu, lebih toleran risiko" },
    ],
    learnMore: "10.21314/JOR.2000.038",
  },

  risk_aversion: {
    label: "Risk Aversion λ (Quantum)",
    short: "Seberapa besar penalti untuk risiko dalam model quantum",
    detail:
      "Dalam formulasi QUBO, λ mengontrol trade-off antara return dan risiko. " +
      "λ kecil (0.1-0.3) = agresif, fokus return. " +
      "λ besar (1.0-2.0) = defensif, fokus risiko minimum.",
    suggestions: [
      { label: "Agresif",    value: 0.2, note: "Maksimalkan return, toleran risiko tinggi" },
      { label: "Seimbang",   value: 0.5, note: "Balance antara return dan risiko" },
      { label: "Defensif",   value: 1.0, note: "Minimasi risiko, return lebih rendah" },
    ],
    learnMore: "10.1103/PhysRevResearch.4.013006",
  },

  allow_short: {
    label: "Short Selling",
    short: "Izinkan posisi negatif (menjual saham yang tidak dimiliki)",
    detail:
      "Short selling memungkinkan model meminjam saham dan menjualnya, berharap harga turun. " +
      "Ini meningkatkan fleksibilitas model tapi menambah risiko kerugian tak terbatas. " +
      "Untuk pemula: JANGAN aktifkan. Untuk market-neutral strategy: bisa diaktifkan.",
    suggestions: [
      { label: "Long Only (Pemula)",      value: "false", note: "Rekomendasi untuk pemula" },
      { label: "Long-Short (Advanced)",   value: "true",  note: "Hanya jika punya fasilitas short" },
    ],
  },

  target_return: {
    label: "Target Return",
    short: "Return tahunan yang diinginkan sebagai constraint optimisasi",
    detail:
      "Jika diisi, model mencari portofolio dengan return ≥ target ini sambil " +
      "meminimumkan risiko (minimum variance frontier). " +
      "Jika kosong (Maximize Sharpe), model mencari portofolio dengan rasio " +
      "return/risiko terbaik (titik tangent pada efficient frontier).",
    suggestions: [
      { label: "Maximize Sharpe",  value: "null",  note: "Default & paling direkomendasikan" },
      { label: "15% per tahun",    value: "15",    note: "Target swing trader" },
      { label: "25% per tahun",    value: "25",    note: "Target growth investor" },
      { label: "BI Rate + 10%",    value: "15.75", note: "Premi risiko 10% di atas risk-free" },
    ],
  },
};

export const MODEL_HELP: Record<string, { when: string; avoid: string; typical_sharpe: string }> = {
  markowitz: {
    when:          "Saham mature (likuid tinggi), pasar stabil, data 1-3 tahun",
    avoid:         "Saham baru / data sedikit — estimasi kovarians tidak akurat",
    typical_sharpe: "0.8 – 1.5 untuk pasar normal",
  },
  cvar: {
    when:          "Saat pasar volatile, atau ingin lindungi dari kerugian ekstrem",
    avoid:         "Bull market kuat — terlalu konservatif, return tertinggal",
    typical_sharpe: "0.6 – 1.2 (lebih fokus tail risk daripada return)",
  },
  rmt: {
    when:          "Universe besar (>15 saham), noise data tinggi, horizon menengah",
    avoid:         "Universe kecil (<5 saham) — tidak cukup data untuk filter noise",
    typical_sharpe: "1.0 – 2.0 (noise filtering meningkatkan akurasi)",
  },
  quantum: {
    when:          "Ingin diversifikasi yang optimal tanpa constraint return",
    avoid:         "Jika butuh return spesifik — model quantum tidak mendukung target return",
    typical_sharpe: "0.5 – 1.5 (tergantung universe dan λ)",
  },
  entropy: {
    when:          "Long-term portfolio, ingin diversifikasi maksimum",
    avoid:         "Day trading / swing — terlalu konservatif untuk horizon pendek",
    typical_sharpe: "0.5 – 1.0 (maksimasi diversifikasi, bukan return)",
  },
};
