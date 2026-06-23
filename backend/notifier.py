"""Push notification via ntfy.sh."""
import httpx

NTFY_BASE = "https://ntfy.sh"


def send(topic: str, title: str, message: str, priority: str = "default",
         tags: list[str] | None = None) -> bool:
    if not topic:
        return False
    try:
        headers = {
            "Title": title,
            "Priority": priority,
            "Tags": ",".join(tags or []),
            "Content-Type": "text/plain; charset=utf-8",
        }
        resp = httpx.post(f"{NTFY_BASE}/{topic}", content=message.encode(),
                          headers=headers, timeout=10)
        return resp.status_code == 200
    except Exception:
        return False


def format_signal_report(ticker: str, sig: dict, schema: str) -> str:
    emoji = {"BUY": "🟢", "SELL": "🔴", "HOLD": "🟡", "WATCH": "🔵"}.get(sig["signal"], "⚪")
    lines = [
        f"{emoji} {ticker}: {sig['signal']}",
        f"   RSI {sig['rsi']} | MA20 {'✓' if sig['above_ma20'] else '✗'} | MA50 {'✓' if sig['above_ma50'] else '✗'}",
        f"   1D {sig['daily_return']:+.2f}% | 1W {sig['week_return']:+.2f}%",
    ]
    if sig.get("reasons"):
        lines.append(f"   → {', '.join(sig['reasons'][:2])}")
    return "\n".join(lines)
