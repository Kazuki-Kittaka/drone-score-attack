import {
  useState,
  useRef,
  useEffect,
  lazy,
  Suspense,
  Component,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  loadRanking,
  loadSettings,
  normalizeNickname,
  sortRanking,
  formatTime,
  seconds,
  newId,
  saveJson,
  RANKING_KEY,
  SETTINGS_KEY,
  type RankingRecord,
  type Settings,
} from "./model";
import { cue, bgm } from "./audio";
import arena from "./assets/backgrounds/bg_drone_race_arena.png";
import victory from "./assets/backgrounds/bg_drone_race_victory.png";
import logo from "./assets/logo/logo_drone_obstacle_race.png";
import challenge from "./assets/buttons/btn_challenge.png";
import next from "./assets/buttons/btn_next.png";
import startImg from "./assets/buttons/btn_start.png";
import stopImg from "./assets/buttons/btn_stop.png";
import rankingImg from "./assets/buttons/btn_ranking.png";
import retry from "./assets/buttons/btn_retry.png";
const Scene = lazy(() => import("./Scene"));
class EffectsBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
type Screen =
  "ranking" | "entry" | "ready" | "countdown" | "playing" | "result";
type Result = { record: RankingRecord; rank: number; isNew: boolean };
function ImageButton({
  src,
  label,
  onClick,
  disabled = false,
  settings,
}: {
  src: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  settings: Settings;
}) {
  return (
    <motion.button
      className="image-button"
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        cue("click", settings);
        onClick();
      }}
      onMouseEnter={() => cue("hover", settings)}
      whileHover={settings.animation ? { scale: 1.025 } : undefined}
      whileTap={settings.animation ? { scale: 0.97 } : undefined}
    >
      <img src={src} alt={label} draggable="false" />
    </motion.button>
  );
}
function Board({ records }: { records: RankingRecord[] }) {
  if (!records.length)
    return (
      <div className="empty">
        <span className="empty-icon">◇</span>
        <h2>まだ記録がありません</h2>
        <p>最初の挑戦者になろう！</p>
      </div>
    );
  return (
    <>
      <div className="podium">
        {[1, 0, 2].map((i) => (
          <div
            className={`podium-card place-${i + 1} ${i === 0 ? "winner" : ""}`}
            key={i}
          >
            <div className="place">
              {i === 0 ? "♛ " : ""}
              {i + 1}位
            </div>
            <div className="podium-name">{records[i]?.nickname || "—"}</div>
            <div className="podium-time">
              {records[i] ? seconds(records[i].timeMs) : "—"}
              <small>秒</small>
            </div>
          </div>
        ))}
      </div>
      <ol className="ranking-list" start={4}>
        {records.slice(3).map((r, i) => (
          <li key={r.id}>
            <b>
              {i + 4}
              <small>位</small>
            </b>
            <span>{r.nickname}</span>
            <strong>
              {seconds(r.timeMs)}
              <small>秒</small>
            </strong>
          </li>
        ))}
      </ol>
    </>
  );
}
export default function App() {
  const [initial] = useState(loadRanking);
  const [ranking, setRanking] = useState(initial.records);
  const [warning, setWarning] = useState(initial.warning);
  const [blocked, setBlocked] = useState(!!initial.warning);
  const [settings, setSettings] = useState(loadSettings);
  const reduced = useReducedMotion();
  const effective = { ...settings, animation: settings.animation && !reduced };
  const [offlineReady, setOfflineReady] = useState(false);
  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      let mounted = true;
      navigator.serviceWorker.ready.then(() => {
        if (mounted) setOfflineReady(true);
      });
      return () => {
        mounted = false;
      };
    }
  }, []);
  const [screen, setScreen] = useState<Screen>("ranking");
  const screenRef = useRef<Screen>("ranking");
  const [nickname, setNickname] = useState("");
  const [inputError, setInputError] = useState("");
  const [count, setCount] = useState<number | string>(3);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(0);
  const stopped = useRef(true);
  const [result, setResult] = useState<Result | null>(null);
  const [admin, setAdmin] = useState(
    (location.pathname.replace(/\/$/, "").endsWith("/admin") || new URLSearchParams(location.search).get("admin")==="1"),
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  function go(s: Screen) {
    screenRef.current = s;
    setScreen(s);
  }
  useEffect(() => {
    const h = () =>
      setAdmin((location.pathname.replace(/\/$/, "").endsWith("/admin") || new URLSearchParams(location.search).get("admin")==="1"));
    addEventListener("popstate", h);
    return () => removeEventListener("popstate", h);
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [screen, admin]);
  useEffect(() => {
    bgm(screen === "ranking" && !admin, settings);
    return () => bgm(false, settings);
  }, [screen, admin, settings]);
  useEffect(() => {
    function update(e: StorageEvent) {
      if (e.key === RANKING_KEY) {
        const r = loadRanking();
        setRanking(r.records);
        setBlocked(!!r.warning);
        setWarning(r.warning);
      }
      if (e.key === SETTINGS_KEY) setSettings(loadSettings());
    }
    addEventListener("storage", update);
    return () => removeEventListener("storage", update);
  }, []);
  function begin() {
    if (screenRef.current !== "ready") return;
    cue("countdown", settings);
    setCount(3);
    go("countdown");
  }
  useEffect(() => {
    if (screen !== "countdown") return;
    const base = performance.now();
    let last = 3;
    let raf = 0;
    function tick() {
      const spent = performance.now() - base;
      const value = 3 - Math.floor(spent / 1000);
      if (value <= 0) {
        started.current = performance.now();
        stopped.current = false;
        setElapsed(0);
        setCount("START!");
        cue("start", settings);
        go("playing");
        return;
      }
      if (value !== last) {
        last = value;
        setCount(value);
        cue("countdown", settings);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen]);
  useEffect(() => {
    if (screen !== "playing") return;
    let raf = 0;
    const hide = setTimeout(() => setCount(""), 650);
    function tick() {
      setElapsed(performance.now() - started.current);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hide);
    };
  }, [screen]);
  function stop() {
    if (screenRef.current !== "playing" || stopped.current) return;
    stopped.current = true;
    const ms = performance.now() - started.current;
    setElapsed(ms);
    const record = {
      id: newId(),
      nickname: normalizeNickname(nickname),
      timeMs: ms,
      createdAt: new Date().toISOString(),
    };
    const current = loadRanking();
    const base = sortRanking([
      ...new Map(
        [...current.records, ...ranking].map((r) => [r.id, r]),
      ).values(),
    ]);
    const list = sortRanking([...base, record]);
    const rank = list.findIndex((r) => r.id === record.id) + 1;
    const isNew = rank === 1 && (!base.length || ms < base[0].timeMs);
    setRanking(list);
    setResult({ record, rank, isNew });
    cue("stop", settings);
    if (blocked || current.warning) {
      setBlocked(true);
      setWarning(
        "保存済みデータを保護するため保存を保留しました。今回の記録は結果画面からJSONで保存してください。",
      );
    } else
      try {
        localStorage.setItem(RANKING_KEY, JSON.stringify(list));
        setWarning("");
      } catch {
        setWarning(
          "ランキングを保存できません。再読み込み前にJSONでバックアップしてください。",
        );
      }
    go("result");
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.repeat) return;
      if (screenRef.current === "ready" && e.key === "Enter") {
        e.preventDefault();
        begin();
      }
      if (screenRef.current === "playing" && e.code === "Space") {
        e.preventDefault();
        stop();
      }
    }
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });
  useEffect(() => {
    if (screen !== "result" || !result) return;
    cue(
      result.isNew ? "new-record" : result.rank ? "rank-in" : "finish",
      settings,
    );
    if (
      !effective.animation ||
      !settings.confetti ||
      !result.rank ||
      result.rank > 3
    )
      return;
    const gold = result.rank === 1;
    try {
      confetti({
        particleCount: gold ? 180 : result.rank === 2 ? 100 : 55,
        spread: gold ? 110 : 80,
        origin: { y: 0.45 },
        colors: gold
          ? ["#ffd64c", "#fff1a2", "#d09c27"]
          : result.rank === 2
            ? ["#dceaff", "#95b9df"]
            : ["#d49365", "#ffd0a2"],
        disableForReducedMotion: true,
      });
    } catch {
      /* optional effect */
    }
    return () => {
      try {
        confetti.reset();
      } catch {
        /* optional */
      }
    };
  }, [screen, result]);
  function enter() {
    const name = normalizeNickname(nickname);
    if (!name) {
      setInputError("ニックネームを入力してください");
      return;
    }
    setNickname(name);
    setInputError("");
    go("ready");
  }
  function exportRanking() {
    saveJson(
      ranking,
      `drone-race-ranking-${new Date().toLocaleDateString("sv-SE")}.json`,
    );
  }
  function changeSettings(p: Partial<Settings>) {
    const s = { ...settings, ...p };
    setSettings(s);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      setWarning(
        "設定を保存できません。この画面を開いている間のみ適用します。",
      );
    }
  }
  function reset() {
    try {
      localStorage.setItem(RANKING_KEY, "[]");
      setRanking([]);
      setBlocked(false);
      setWarning("");
      setConfirmReset(false);
    } catch {
      setWarning("初期化できません。ブラウザの保存設定を確認してください。");
    }
  }
  function navigateAdmin(on: boolean) {
    if (screen === "playing" || screen === "countdown") return;
    history.pushState(
      {},
      "",
      `${import.meta.env.BASE_URL}${on ? "?admin=1" : ""}`,
    );
    setAdmin(on);
    setConfirmReset(false);
    go("ranking");
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setWarning("全画面表示を開始できません。ブラウザのF11をご利用ください。");
    }
  }
  const isVictory = screen === "result" && result?.isNew;
  const transitionMotion =
    effective.animation && screen !== "playing" && screen !== "countdown";
  return (
    <div
      className={`app ${screen} ${effective.animation ? "" : "no-motion"}`}
      style={{
        backgroundImage: `linear-gradient(180deg,rgba(1,8,24,.28),rgba(1,8,24,.63)),url(${isVictory ? victory : arena})`,
      }}
    >
      {settings.three &&
        effective.animation &&
        !admin &&
        (screen !== "playing" || count === "START!") && (
          <EffectsBoundary>
            <Suspense fallback={null}>
              <Scene
                mode={
                  screen === "playing"
                    ? "launch"
                    : screen === "result" && result?.rank === 1
                      ? "victory"
                      : screen === "result" && result?.rank === 2
                        ? "silver"
                        : screen === "result" && result?.rank === 3
                          ? "bronze"
                          : "idle"
                }
              />
            </Suspense>
          </EffectsBoundary>
        )}
      <header>
        <img className="logo" src={logo} alt="ドローン障害物レース" />
        <span className="festival">文化祭特別企画</span>
        <p>タイムアタックに挑戦！</p>
      </header>
      {warning && (
        <div className="warning" role="alert">
          {warning}{" "}
          <button
            onClick={() =>
              saveJson(
                result ? { ranking, unsavedRecord: result.record } : ranking,
                "drone-race-backup.json",
              )
            }
          >
            JSONバックアップ
          </button>
        </div>
      )}
      <main>
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={admin ? "admin" : screen}
            className={`content ${admin ? "admin-panel" : ""}`}
            initial={transitionMotion ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={transitionMotion ? { opacity: 0 } : undefined}
            transition={{ duration: transitionMotion ? 0.2 : 0 }}
          >
            {admin ? (
              <>
                <h1 ref={heading} tabIndex={-1}>
                  スタッフ管理画面
                </h1>
                <p>記録・音・演出の設定</p>
                <div className="admin-grid">
                  <div>
                    <h2>ランキング確認</h2>
                    <Board records={ranking} />
                    <div className="admin-actions">
                      <button onClick={exportRanking}>JSONエクスポート</button>
                      <button
                        className="danger"
                        onClick={() => setConfirmReset(true)}
                      >
                        ランキング初期化
                      </button>
                      <button
                        onClick={() => {
                          try {
                            const raw = localStorage.getItem(RANKING_KEY);
                            saveJson({ raw }, "drone-race-raw-backup.json");
                          } catch {
                            setWarning("保存データを読み出せません。");
                          }
                        }}
                      >
                        保存データのバックアップ
                      </button>
                    </div>
                    {confirmReset && (
                      <div
                        className="confirm"
                        role="alertdialog"
                        aria-label="ランキング初期化の確認"
                      >
                        <p>
                          上位10名の記録をすべて削除します。
                          <br />
                          先にJSONを保存してください。
                        </p>
                        <button onClick={reset} className="danger">
                          すべて削除する
                        </button>
                        <button
                          autoFocus
                          onClick={() => setConfirmReset(false)}
                        >
                          キャンセル
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="settings">
                    <h2>会場設定</h2>
                    {(
                      [
                        ["se", "SE"],
                        ["bgm", "BGM"],
                        ["three", "Three.js"],
                        ["confetti", "紙吹雪"],
                        ["animation", "アニメーション"],
                      ] as const
                    ).map(([k, label]) => (
                      <label className="toggle" key={k}>
                        <span>{label}</span>
                        <input
                          type="checkbox"
                          aria-label={label}
                          checked={settings[k]}
                          onChange={(e) =>
                            changeSettings({ [k]: e.target.checked })
                          }
                        />
                        <b>{settings[k] ? "ON" : "OFF"}</b>
                      </label>
                    ))}
                    {(
                      [
                        ["seVolume", "SE音量"],
                        ["bgmVolume", "BGM音量"],
                      ] as const
                    ).map(([k, label]) => (
                      <label className="volume" key={k}>
                        {label} {Math.round(settings[k] * 100)}%
                        <input
                          aria-label={label}
                          type="range"
                          min="0"
                          max="1"
                          step=".05"
                          value={settings[k]}
                          onChange={(e) =>
                            changeSettings({ [k]: Number(e.target.value) })
                          }
                        />
                      </label>
                    ))}
                    <p className="muted">
                      音源は同梱の合成SE。BGMは任意のファイルを追加すると再生します。
                    </p>
                    <button onClick={fullscreen}>全画面表示 / 解除</button>
                    <button onClick={() => navigateAdmin(false)}>
                      会場画面に戻る
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {screen === "ranking" && (
                  <>
                    <h1 ref={heading} tabIndex={-1} className="ranking-title">
                      ♛ ランキング <span>TOP10</span>
                    </h1>
                    <Board records={ranking} />
                    <div className="actions">
                      <ImageButton
                        src={challenge}
                        label="挑戦する"
                        onClick={() => {
                          setNickname("");
                          go("entry");
                        }}
                        settings={effective}
                      />
                    </div>
                  </>
                )}
                {screen === "entry" && (
                  <>
                    <h1 ref={heading} tabIndex={-1}>
                      挑戦者エントリー
                    </h1>
                    <form
                      className="frame entry-frame"
                      onSubmit={(e) => {
                        e.preventDefault();
                        enter();
                      }}
                    >
                      <label htmlFor="nickname">
                        ニックネームを入力してください
                      </label>
                      <input
                        id="nickname"
                        autoFocus
                        value={nickname}
                        onChange={(e) => {
                          setNickname(
                            Array.from(e.target.value).slice(0, 12).join(""),
                          );
                          setInputError("");
                        }}
                        aria-describedby="nickname-help nickname-error"
                        aria-invalid={!!inputError}
                        autoComplete="off"
                        placeholder="例：かずき"
                      />
                      <p id="nickname-help">
                        ※本名ではなくニックネームでOK（最大12文字）
                      </p>
                      <p
                        id="nickname-error"
                        className="input-error"
                        role="alert"
                      >
                        {inputError}
                      </p>
                      <button
                        type="submit"
                        className="image-button"
                        aria-label="次へ"
                        onClick={() => cue("click", settings)}
                      >
                        <img src={next} alt="次へ" />
                      </button>
                    </form>
                    <button className="back" onClick={() => go("ranking")}>
                      ‹ ランキングに戻る
                    </button>
                  </>
                )}
                {screen === "ready" && (
                  <>
                    <h1 ref={heading} tabIndex={-1} className="gold-title">
                      準備はできましたか？
                    </h1>
                    <div className="frame ready-frame">
                      <p className="eyebrow">挑戦者</p>
                      <div className="challenger">{nickname}</div>
                      <p>スタッフの合図でスタートしてください</p>
                      <ImageButton
                        src={startImg}
                        label="スタート"
                        onClick={begin}
                        settings={effective}
                      />
                    </div>
                    <p className="ready-key-hint">Enterキーでもスタート</p>
                    <button className="back" onClick={() => go("entry")}>
                      ‹ もどる
                    </button>
                  </>
                )}
                {screen === "countdown" && (
                  <div className="countdown-screen">
                    <h1 ref={heading} tabIndex={-1}>
                      まもなくスタート
                    </h1>
                    <motion.div
                      key={count}
                      className="countdown-number"
                      initial={
                        effective.animation ? { scale: 1.3, opacity: 0 } : false
                      }
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      role="status"
                      aria-live="assertive"
                    >
                      {count}
                    </motion.div>
                    <p>{nickname}</p>
                  </div>
                )}
                {screen === "playing" && (
                  <>
                    <h1 ref={heading} tabIndex={-1} className="playing-label">
                      ● 計測中
                    </h1>
                    <p className="eyebrow">挑戦者</p>
                    <div className="playing-name">{nickname}</div>
                    <div className="timer" aria-label="計測タイマー">
                      {formatTime(elapsed)}
                    </div>
                    {count === "START!" && (
                      <div className="start-overlay" role="status">
                        START!
                      </div>
                    )}
                    <ImageButton
                      src={stopImg}
                      label="ストップ"
                      onClick={stop}
                      disabled={stopped.current}
                      settings={effective}
                    />
                    <p className="key-hint">Spaceキーでもストップ</p>
                  </>
                )}
                {screen === "result" && result && (
                  <>
                    <h1
                      ref={heading}
                      tabIndex={-1}
                      className={`result-title ${isVictory ? "new-record" : ""}`}
                    >
                      {isVictory ? "新記録！" : "ゴール！"}
                    </h1>
                    {isVictory && <div className="record-tag">NEW RECORD</div>}
                    <div
                      className={`result-card place-${result.rank}`}
                      role="status"
                      aria-live="polite"
                    >
                      <div className="result-rank">
                        {result.rank > 0
                          ? `${result.rank === 1 ? "♛ " : ""}${result.rank}位`
                          : "TOP10圏外"}
                      </div>
                      <div className="result-name">
                        {result.record.nickname}
                      </div>
                      <div className="result-time">
                        {seconds(result.record.timeMs)}
                        <small>秒</small>
                      </div>
                      <p>
                        {isVictory
                          ? "おめでとう！"
                          : result.rank
                            ? "ランキング入り！"
                            : "今回はランキング圏外"}
                      </p>
                      <small>
                        {result.rank
                          ? `現在 ${result.rank}位`
                          : "また挑戦しよう！"}
                      </small>
                    </div>
                    <div className="actions result-actions">
                      <ImageButton
                        src={rankingImg}
                        label="ランキングを見る"
                        onClick={() => go("ranking")}
                        settings={effective}
                      />
                      <ImageButton
                        src={retry}
                        label="もう一度挑戦"
                        onClick={() => go("ready")}
                        settings={effective}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </main>
      {!admin && screen !== "playing" && screen !== "countdown" && (
        <footer>
          <span>専門学校IVY DRONE TIME ATTACK</span>
          <span className="offline-status">
            {import.meta.env.PROD
              ? offlineReady
                ? "オフライン準備完了"
                : "オフライン準備中"
              : "ローカル開発"}
          </span>
          <button onClick={fullscreen} aria-label="全画面表示">
            全画面
          </button>
          <button onClick={() => navigateAdmin(true)}>スタッフ設定</button>
        </footer>
      )}
    </div>
  );
}
