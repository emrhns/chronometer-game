import { useEffect, useRef, useState } from "react";
import "./App.css";
import { supabase } from "./supabase";

const TARGET_TIME = 60000;

function App() {
  const [screen, setScreen] = useState("home");

  // =========================================================
  // OYUN
  // =========================================================

  const [gameId, setGameId] = useState("");
  const [gameCode, setGameCode] = useState("");

  // =========================================================
  // OYUNCU
  // =========================================================

  const [playerName, setPlayerName] = useState("");
  const [playerTime, setPlayerTime] = useState(0);
  const [playerRunning, setPlayerRunning] = useState(false);
  const [playerFinished, setPlayerFinished] = useState(false);

  // Supabase players tablosundaki kayıt ID'si
  const [playerRowId, setPlayerRowId] = useState(null);

  // =========================================================
  // MOBİL KRONOMETRE REFLERİ
  // =========================================================

  const playerStartRef = useRef(null);
  const playerTimerRef = useRef(null);

  // Oyunu başlatan parmağın pointer ID'si
  const activePointerIdRef = useRef(null);

  // Oyun aktifken pointer gerçekten tutuluyor mu?
  const playerActionRef = useRef(false);

  // Supabase'e sonuç gönderiliyor mu?
  const savingResultRef = useRef(false);

  // =========================================================
  // HAKEM
  // =========================================================

  const [results, setResults] = useState([]);
  const [judgeLoading, setJudgeLoading] = useState(false);

  // =========================================================
  // OYUN KODU OLUŞTUR
  // =========================================================

  const generateGameCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {
      code += chars.charAt(
        Math.floor(Math.random() * chars.length)
      );
    }

    return code;
  };

  // =========================================================
  // OYUNCU KRONOMETRE
  // =========================================================

  useEffect(() => {
    if (!playerRunning) {
      if (playerTimerRef.current) {
        clearInterval(playerTimerRef.current);
        playerTimerRef.current = null;
      }

      return;
    }

    playerTimerRef.current = setInterval(() => {
      if (playerStartRef.current === null) {
        return;
      }

      const elapsed =
        performance.now() - playerStartRef.current;

      setPlayerTime(elapsed);
    }, 10);

    return () => {
      if (playerTimerRef.current) {
        clearInterval(playerTimerRef.current);
        playerTimerRef.current = null;
      }
    };
  }, [playerRunning]);

  // =========================================================
  // ZAMAN FORMAT
  // =========================================================

  const formatTime = (milliseconds) => {
    const minutes = Math.floor(
      milliseconds / 60000
    );

    const seconds = Math.floor(
      (milliseconds % 60000) / 1000
    );

    const hundredths = Math.floor(
      (milliseconds % 1000) / 10
    );

    return `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}.${String(
      hundredths
    ).padStart(2, "0")}`;
  };

  // =========================================================
  // FARK
  // =========================================================

  const calculateDifference = (time) => {
    return Math.abs(
      time - TARGET_TIME
    );
  };

  // =========================================================
  // MOBİL OYUNU TAMAMEN TEMİZLE
  // =========================================================

  const resetPlayerInteraction = () => {
    if (playerTimerRef.current) {
      clearInterval(playerTimerRef.current);
      playerTimerRef.current = null;
    }

    playerStartRef.current = null;
    activePointerIdRef.current = null;
    playerActionRef.current = false;
  };

  // =========================================================
  // ANA SAYFAYA DÖN
  // =========================================================

  const goHome = () => {
    resetPlayerInteraction();

    setScreen("home");

    setGameId("");
    setGameCode("");

    setPlayerName("");
    setPlayerTime(0);
    setPlayerRunning(false);
    setPlayerFinished(false);
    setPlayerRowId(null);

    setResults([]);
    setJudgeLoading(false);
    savingResultRef.current = false;
  };

  // =========================================================
  // OYUNCUYA GİT
  // =========================================================

  const openPlayer = () => {
    resetPlayerInteraction();

    setGameId("");
    setGameCode("");

    setPlayerName("");
    setPlayerTime(0);
    setPlayerRunning(false);
    setPlayerFinished(false);
    setPlayerRowId(null);

    setScreen("player-join");
  };

  // =========================================================
  // HAKEME GİT
  // =========================================================

  const openJudge = () => {
    resetPlayerInteraction();

    setGameId("");
    setGameCode("");
    setResults([]);

    setScreen("judge-create");
  };

  // =========================================================
  // HAKEM - OYUN OLUŞTUR
  // =========================================================

  const createGame = async () => {
    setJudgeLoading(true);

    try {
      let code = "";
      let created = false;

      for (let attempt = 0; attempt < 5; attempt++) {
        const generatedCode =
          generateGameCode();

        const { data, error } = await supabase
          .from("games")
          .insert([
            {
              id: generatedCode,
              status: "active",
              target_time_ms: TARGET_TIME,
            },
          ])
          .select()
          .single();

        if (!error && data) {
          code = data.id;
          created = true;
          break;
        }
      }

      if (!created) {
        alert(
          "Oyun oluşturulamadı. Tekrar deneyin."
        );
        return;
      }

      setGameId(code);
      setGameCode(code);
      setResults([]);

      setScreen("judge");
    } catch (error) {
      console.error(
        "Oyun oluşturulamadı:",
        error
      );

      alert(
        "Oyun oluşturulurken bir hata oluştu."
      );
    } finally {
      setJudgeLoading(false);
    }
  };

  // =========================================================
  // OYUNCU - OYUNA KATIL
  // =========================================================

  const joinGame = async () => {
    const cleanCode = gameCode
      .trim()
      .toUpperCase();

    if (!cleanCode) {
      alert("Oyun kodunu gir.");
      return;
    }

    const { data, error } = await supabase
      .from("games")
      .select(
        "id,status,target_time_ms"
      )
      .eq("id", cleanCode)
      .maybeSingle();

    if (error) {
      console.error(
        "Oyun kontrol edilemedi:",
        error
      );

      alert(
        "Oyun kontrol edilirken hata oluştu."
      );

      return;
    }

    if (!data) {
      alert(
        "Bu oyun koduna ait bir oyun bulunamadı."
      );

      return;
    }

    if (data.status !== "active") {
      alert(
        "Bu oyun artık aktif değil."
      );

      return;
    }

    setGameId(data.id);
    setGameCode(data.id);

    setPlayerName("");
    setPlayerTime(0);
    setPlayerRunning(false);
    setPlayerFinished(false);
    setPlayerRowId(null);

    resetPlayerInteraction();

    setScreen("player-name");
  };

  // =========================================================
  // OYUNCU İSİM ONAY
  // =========================================================

  const startPlayerGame = async () => {
    const cleanName =
      playerName.trim();

    if (!cleanName) {
      alert("Lütfen adını gir.");
      return;
    }

    if (!gameId) {
      alert(
        "Önce bir oyuna katılmalısın."
      );
      return;
    }

    const {
      data: gameData,
      error: gameError,
    } = await supabase
      .from("games")
      .select(
        "id,status,target_time_ms"
      )
      .eq("id", gameId)
      .maybeSingle();

    if (gameError) {
      console.error(
        "Oyun kontrol edilemedi:",
        gameError
      );

      alert(
        "Oyun kontrol edilirken hata oluştu."
      );

      return;
    }

    if (!gameData) {
      alert("Oyun bulunamadı.");
      return;
    }

    if (gameData.status !== "active") {
      alert(
        "Bu oyun artık aktif değil."
      );

      setScreen("player-join");
      return;
    }

    // =====================================================
    // OYUNCUYU BEKLEYEN OLARAK KAYDET
    // =====================================================

    const {
      data: playerData,
      error: playerError,
    } = await supabase
      .from("players")
      .insert([
        {
          name: cleanName,
          game_id: gameId,
          time_ms: 0,
          difference_ms: TARGET_TIME,
        },
      ])
      .select()
      .single();

    if (playerError) {
      console.error(
        "Oyuncu oyuna eklenemedi:",
        playerError
      );

      alert(
        "Oyuna katılırken hata oluştu. Tekrar deneyin."
      );

      return;
    }

    setPlayerRowId(
      playerData.id
    );

    setPlayerName(cleanName);
    setPlayerTime(0);
    setPlayerRunning(false);
    setPlayerFinished(false);

    resetPlayerInteraction();

    setScreen("player-game");
  };

  // =========================================================
  // OYUNCU BASMAYA BAŞLADI
  //
  // MOBİL İÇİN KRİTİK KISIM
  //
  // Parmağın ekrana değdiği AN başlar.
  // Parmağın hareket etmesi oyunu durdurmaz.
  // Sadece aynı pointer takip edilir.
  // =========================================================

  const handlePlayerDown = (event) => {
    event.preventDefault();

    // Oyun zaten bittiyse dokunmayı kabul etme.
    if (playerFinished) {
      return;
    }

    // Zaten bir parmakla oynanıyorsa ikinci parmağı kabul etme.
    if (playerActionRef.current) {
      return;
    }

    // Başka bir pointer aktifse kabul etme.
    if (activePointerIdRef.current !== null) {
      return;
    }

    // =====================================================
    // BU PARMAĞI AKTİF PARMAK OLARAK KAYDET
    // =====================================================

    activePointerIdRef.current =
      event.pointerId;

    playerActionRef.current = true;

    // =====================================================
    // POINTER CAPTURE
    //
    // Parmak butonun üzerinden çıksa bile
    // pointerup event'ini almaya devam ederiz.
    // =====================================================

    try {
      event.currentTarget.setPointerCapture(
        event.pointerId
      );
    } catch (error) {
      console.warn(
        "Pointer capture desteklenmiyor:",
        error
      );
    }

    // =====================================================
    // KRONOMETREYİ BAŞLAT
    // =====================================================

    playerStartRef.current =
      performance.now();

    setPlayerTime(0);
    setPlayerRunning(true);
  };

  // =========================================================
  // OYUNCU PARMAĞINI ÇEKTİ
  //
  // MOBİLDE OYUNUN BİTTİĞİ ANA NOKTA
  //
  // Parmağın ekrandan kaldırılması = pointerup
  // =========================================================

  const handlePlayerUp = async (event) => {
    if (event) {
      event.preventDefault();
    }

    // =====================================================
    // SADECE OYUNU BAŞLATAN PARMAK
    // =====================================================

    if (
      event &&
      activePointerIdRef.current !==
        event.pointerId
    ) {
      return;
    }

    // Oyun başlamadıysa hiçbir şey yapma.
    if (!playerActionRef.current) {
      return;
    }

    // Başlangıç zamanı yoksa hiçbir şey yapma.
    if (playerStartRef.current === null) {
      return;
    }

    // =====================================================
    // KRONOMETREYİ DURDUR
    // =====================================================

    const finalTime =
      performance.now() -
      playerStartRef.current;

    const roundedTime =
      Math.max(
        0,
        Math.round(finalTime)
      );

    const difference =
      calculateDifference(
        roundedTime
      );

    // =====================================================
    // LOCAL DURUMU HEMEN GÜNCELLE
    // =====================================================

    setPlayerTime(
      roundedTime
    );

    setPlayerRunning(false);
    setPlayerFinished(true);

    // =====================================================
    // POINTER DURUMUNU TEMİZLE
    // =====================================================

    playerStartRef.current = null;
    playerActionRef.current = false;
    activePointerIdRef.current = null;

    // =====================================================
    // SUPABASE'E SONUCU KAYDET
    // =====================================================

    if (!playerRowId) {
      console.error(
        "Oyuncu kayıt ID'si bulunamadı."
      );

      alert(
        "Oyuncu kaydı bulunamadı."
      );

      return;
    }

    // Aynı sonucu iki kere göndermeyi engelle.
    if (savingResultRef.current) {
      return;
    }

    savingResultRef.current = true;

    try {
      const {
        data: updatedPlayer,
        error,
      } = await supabase
        .from("players")
        .update({
          time_ms: roundedTime,
          difference_ms:
            Math.round(difference),
        })
        .eq("id", playerRowId)
        .select()
        .single();

      if (error) {
        console.error(
          "Oyuncu sonucu güncellenemedi:",
          error
        );

        alert(
          "Sonuç ekranda gösterildi ancak Supabase'e kaydedilemedi."
        );

        return;
      }

      console.log(
        "Oyuncu sonucu başarıyla güncellendi:",
        updatedPlayer
      );
    } finally {
      savingResultRef.current = false;
    }
  };

  // =========================================================
  // POINTER CANCEL
  //
  // Mobil tarayıcı bazı durumlarda pointerup yerine
  // pointercancel gönderebilir.
  //
  // Bunu da bırakma olarak kabul ediyoruz.
  // =========================================================

  const handlePlayerCancel = async (event) => {
    if (event) {
      event.preventDefault();
    }

    await handlePlayerUp(event);
  };

  // =========================================================
  // HAKEM SONUÇLARI GETİR
  // =========================================================

  const loadResults = async () => {
    if (!gameId) {
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("players")
      .select(
        "id,name,time_ms,difference_ms,created_at"
      )
      .eq("game_id", gameId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Oyuncular alınamadı:",
        error
      );

      return;
    }

    const players =
      data || [];

    const sortedPlayers =
      [...players].sort(
        (a, b) => {
          const aWaiting =
            Number(a.time_ms) === 0;

          const bWaiting =
            Number(b.time_ms) === 0;

          // İkisi de bekliyorsa katılma sırasını koru.
          if (
            aWaiting &&
            bWaiting
          ) {
            return (
              new Date(a.created_at) -
              new Date(b.created_at)
            );
          }

          // Bekleyenleri alta gönder.
          if (aWaiting) {
            return 1;
          }

          if (bWaiting) {
            return -1;
          }

          // Tamamlananları farkına göre sırala.
          return (
            Number(a.difference_ms) -
            Number(b.difference_ms)
          );
        }
      );

    setResults(
      sortedPlayers
    );
  };

  // =========================================================
  // HAKEM SONUÇLARINI OTOMATİK YENİLE
  // =========================================================

  useEffect(() => {
    if (
      screen !== "judge" ||
      !gameId
    ) {
      return;
    }

    loadResults();

    const interval =
      setInterval(() => {
        loadResults();
      }, 1000);

    return () =>
      clearInterval(interval);
  }, [
    screen,
    gameId,
  ]);

  // =========================================================
  // HAKEM OYUNU BİTİR
  // =========================================================

  const finishGame = async () => {
    if (!gameId) {
      return;
    }

    const confirmed =
      window.confirm(
        "Oyunu bitirmek istediğine emin misin?"
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await supabase
        .from("games")
        .update({
          status: "finished",
          ended_at:
            new Date().toISOString(),
        })
        .eq("id", gameId);

    if (error) {
      console.error(
        "Oyun bitirilemedi:",
        error
      );

      alert(
        "Oyun bitirilemedi."
      );

      return;
    }

    await loadResults();
  };

  // =========================================================
  // OYUN BUTONU MOBİL STİLİ
  //
  // CSS'e bağlı kalmadan kritik touch ayarlarını
  // JSX üzerinden de garanti ediyoruz.
  // =========================================================

  const mobileGameButtonStyle = {
    touchAction: "none",
    WebkitUserSelect: "none",
    userSelect: "none",
    WebkitTouchCallout: "none",
    WebkitTapHighlightColor: "transparent",
    WebkitAppearance: "none",
    appearance: "none",
    cursor: "pointer",
  };

  // =========================================================
  // ANA EKRAN
  // =========================================================

  if (screen === "home") {
    return (
      <div className="app">
        <main className="content">

          <div className="title">

            <div className="eyebrow">
              CHRONOMETER GAME
            </div>

            <h1>
              60 SANİYE
              <span className="tiny-star">
                ★
              </span>
            </h1>

            <p>
              Zamanı hisset 1:00'a en yakın ol.
            </p>

          </div>

          <div className="role-title">
            ROLÜNÜ SEÇ
          </div>

          <div className="role-grid">

            <button
              className="role-card"
              type="button"
              onClick={openPlayer}
            >
              <div className="role-number">
                01 —
              </div>

              <div className="role-icon">
                ♟
              </div>

              <h2>
                OYUNCU
              </h2>

              <p>
                Oyuna katıl
              </p>

              <span className="role-arrow">
                →
              </span>
            </button>

            <button
              className="role-card"
              type="button"
              onClick={openJudge}
            >
              <div className="role-number">
                02 —
              </div>

              <div className="role-icon">
                ★
              </div>

              <h2>
                HAKEM
              </h2>

              <p>
                Oyun kur
              </p>

              <span className="role-arrow">
                →
              </span>
            </button>

          </div>

        </main>
      </div>
    );
  }

  // =========================================================
  // OYUNCU - OYUN KODU
  // =========================================================

  if (
    screen === "player-join"
  ) {
    return (
      <div className="app">
        <main className="content">

          <div className="title">

            <div className="eyebrow">
              OYUNCU
            </div>

            <h1>
              OYUNA KATIL
            </h1>

            <p>
              Hakemin verdiği oyun kodunu gir.
            </p>

          </div>

          <div className="game-panel">

            <div className="target">
              OYUN KODU
            </div>

            <input
              type="text"
              value={gameCode}
              onChange={(event) =>
                setGameCode(
                  event.target.value
                    .toUpperCase()
                    .replace(
                      /[^A-Z0-9]/g,
                      ""
                    )
                    .slice(0, 6)
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  joinGame();
                }
              }}
              placeholder="ÖRN. A7K92P"
              maxLength={6}
              autoFocus
              className="game-code-input"
            />

            <button
              className="hold-button"
              type="button"
              onClick={joinGame}
              disabled={
                gameCode.length !== 6
              }
              style={{
                opacity:
                  gameCode.length === 6
                    ? 1
                    : 0.4,
              }}
            >
              OYUNA KATIL →
            </button>

          </div>

          <button
            className="back-button"
            type="button"
            onClick={goHome}
          >
            ← GERİ
          </button>

        </main>
      </div>
    );
  }

  // =========================================================
  // OYUNCU - İSİM
  // =========================================================

  if (
    screen === "player-name"
  ) {
    return (
      <div className="app">
        <main className="content">

          <div className="title">

            <div className="eyebrow">
              OYUNCU
            </div>

            <h1>
              HAZIR MISIN?
            </h1>

            <p>
              Yarışmacı adını gir.
            </p>

          </div>

          <div className="game-panel">

            <div className="target">
              OYUN&nbsp;&nbsp;
              {gameId}
            </div>

            <input
              type="text"
              value={playerName}
              onChange={(event) =>
                setPlayerName(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  startPlayerGame();
                }
              }}
              placeholder="Adını yaz"
              maxLength={30}
              autoFocus
              className="player-name-input"
            />

            <button
              className="hold-button"
              type="button"
              onClick={
                startPlayerGame
              }
              disabled={
                !playerName.trim()
              }
              style={{
                opacity:
                  playerName.trim()
                    ? 1
                    : 0.4,
              }}
            >
              DEVAM ET →
            </button>

          </div>

          <button
            className="back-button"
            type="button"
            onClick={() =>
              setScreen(
                "player-join"
              )
            }
          >
            ← GERİ
          </button>

        </main>
      </div>
    );
  }

  // =========================================================
  // OYUNCU - OYUN
  // =========================================================

  if (
    screen === "player-game"
  ) {
    return (
      <div className="app">
        <main
          className="content"
          style={{
            touchAction: "none",
          }}
        >

          <div className="title">

            <div className="eyebrow">
              {playerName}
            </div>

            <h1>
              60 SANİYE
            </h1>

            <p>
              {playerFinished
                ? "Sonucun kaydedildi."
                : "1:00'a en yakın olmaya çalış."}
            </p>

          </div>

          <div
            className="game-panel"
            style={{
              touchAction: "none",
            }}
          >

            {!playerFinished && (
              <>
                <div className="target">
                  HEDEF&nbsp;&nbsp;
                  01:00.00
                </div>

                <div className="timer">
                  {formatTime(
                    playerTime
                  )}
                </div>

                <div className="instruction">
                  {playerRunning
                    ? "PARMAĞINI ÇEKME"
                    : "EKRANA BASILI TUT"}
                </div>

                {/* =================================================
                    MOBİL OYUN BUTONU

                    Parmak burada olduğu sürece oyun çalışır.

                    Parmak:
                    ↓
                    BAS
                    ↓
                    HAREKET ETTİR
                    ↓
                    HAREKET ETSE DE DEVAM
                    ↓
                    EKRANDAN KALDIR
                    ↓
                    DUR
                ================================================== */}

                <button
                  className={`hold-button ${
                    playerRunning
                      ? "holding"
                      : ""
                  }`}
                  type="button"

                  // Parmağın değdiği an
                  onPointerDown={
                    handlePlayerDown
                  }

                  // Parmağın ekrandan kaldırıldığı an
                  onPointerUp={
                    handlePlayerUp
                  }

                  // Mobil tarayıcı pointer'ı
                  // iptal ederse bırakma kabul ediyoruz.
                  onPointerCancel={
                    handlePlayerCancel
                  }

                  // Pointer capture sayesinde
                  // parmak butondan dışarı kaysa bile
                  // pointerup alınır.
                  onGotPointerCapture={() => {
                    // Bilerek boş.
                  }}

                  onLostPointerCapture={() => {
                    // Burada oyunu DURDURMUYORUZ.
                    //
                    // Çünkü parmağın butondan dışarı
                    // hareket etmesi "bırakmak" değildir.
                    //
                    // Gerçek bırakma:
                    // onPointerUp
                    //
                    // Böylece kullanıcı parmağını
                    // ekranda hareket ettirebilir.
                  }}

                  onContextMenu={(event) => {
                    event.preventDefault();
                  }}

                  onDragStart={(event) => {
                    event.preventDefault();
                  }}

                  style={
                    mobileGameButtonStyle
                  }
                >
                  <span>
                    {playerRunning
                      ? "TUTUYORUM"
                      : "BAŞLA"}
                  </span>
                </button>
              </>
            )}

            {playerFinished && (
              <>
                <div className="target">
                  SONUCUN KAYDEDİLDİ
                </div>

                <div className="timer">
                  {formatTime(
                    playerTime
                  )}
                </div>

                <div className="instruction">
                  HAKEM SONUCUNU GÖREBİLİR
                </div>

                <button
                  className="hold-button"
                  type="button"
                  onClick={goHome}
                >
                  TAMAM
                </button>
              </>
            )}

          </div>

        </main>
      </div>
    );
  }

  // =========================================================
  // HAKEM - OYUN OLUŞTUR
  // =========================================================

  if (
    screen === "judge-create"
  ) {
    return (
      <div className="app">
        <main className="content">

          <div className="title">

            <div className="eyebrow">
              HAKEM PANELİ
            </div>

            <h1>
              OYUN KUR
            </h1>

            <p>
              Yeni bir 60 saniye oyunu oluştur.
            </p>

          </div>

          <div className="game-panel">

            <div className="target">
              HEDEF&nbsp;&nbsp;
              01:00.00
            </div>

            <button
              className="hold-button"
              type="button"
              onClick={createGame}
              disabled={judgeLoading}
            >
              {judgeLoading
                ? "OLUŞTURULUYOR..."
                : "OYUNU OLUŞTUR →"}
            </button>

          </div>

          <button
            className="back-button"
            type="button"
            onClick={goHome}
          >
            ← GERİ
          </button>

        </main>
      </div>
    );
  }

  // =========================================================
  // HAKEM PANELİ
  // =========================================================

  if (
    screen === "judge"
  ) {
    return (
      <div className="app">
        <main className="content">

          <div className="title">

            <div className="eyebrow">
              HAKEM PANELİ
            </div>

            <h1>
              SONUÇLAR
            </h1>

            <p>
              01:00.00'a en yakın sonuç üstte.
            </p>

          </div>

          <div
            className="game-panel"
            style={{
              width:
                "min(850px, 100%)",
            }}
          >

            <div className="target">
              OYUN KODU
            </div>

            <div
              style={{
                fontSize:
                  "clamp(42px, 8vw, 72px)",
                fontWeight: "900",
                letterSpacing: "8px",
                marginBottom: "25px",
                textAlign: "center",
              }}
            >
              {gameCode}
            </div>

            <div
              style={{
                fontSize: "13px",
                letterSpacing: "2px",
                opacity: 0.55,
                marginBottom: "25px",
                textAlign: "center",
              }}
            >
              OYUNCULAR BU KODLA KATILABİLİR
            </div>

            <button
              className="hold-button"
              type="button"
              onClick={finishGame}
              style={{
                marginBottom: "30px",
              }}
            >
              OYUNU BİTİR
            </button>

            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection:
                  "column",
                gap: "10px",
              }}
            >

              {results.length === 0 && (
                <div
                  style={{
                    padding:
                      "35px 20px",
                    textAlign:
                      "center",
                    color:
                      "rgba(255,255,255,0.45)",
                    letterSpacing:
                      "2px",
                    fontSize:
                      "13px",
                  }}
                >
                  OYUNCULAR BEKLENİYOR...
                </div>
              )}

              {results.map(
                (
                  result,
                  index
                ) => {
                  const isWaiting =
                    Number(
                      result.time_ms
                    ) === 0;

                  return (
                    <div
                      key={
                        result.id
                      }
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "55px 1fr 150px 120px",
                        alignItems:
                          "center",
                        gap: "15px",
                        padding:
                          "16px 20px",
                        borderRadius:
                          "12px",
                        border:
                          !isWaiting &&
                          index === 0
                            ? "1px solid rgba(255,40,40,0.7)"
                            : "1px solid rgba(255,255,255,0.08)",
                        background:
                          !isWaiting &&
                          index === 0
                            ? "rgba(255,0,0,0.07)"
                            : "rgba(255,255,255,0.025)",
                        opacity:
                          isWaiting
                            ? 0.65
                            : 1,
                      }}
                    >

                      <div
                        style={{
                          fontSize:
                            "20px",
                          fontWeight:
                            "700",
                          color:
                            !isWaiting &&
                            index === 0
                              ? "#ff3030"
                              : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {isWaiting
                          ? "—"
                          : `#${
                              index + 1
                            }`}
                      </div>

                      <div
                        style={{
                          textAlign:
                            "left",
                          fontWeight:
                            "700",
                          color:
                            "#ffffff",
                        }}
                      >
                        {result.name}
                      </div>

                      <div
                        style={{
                          fontVariantNumeric:
                            "tabular-nums",
                          color:
                            "#ffffff",
                        }}
                      >
                        {isWaiting
                          ? "BEKLİYOR..."
                          : formatTime(
                              result.time_ms
                            )}
                      </div>

                      <div
                        style={{
                          color:
                            isWaiting
                              ? "rgba(255,255,255,0.35)"
                              : "#ff3030",
                          fontWeight:
                            "700",
                          fontVariantNumeric:
                            "tabular-nums",
                        }}
                      >
                        {isWaiting
                          ? "—"
                          : `${(
                              result.difference_ms /
                              1000
                            ).toFixed(
                              2
                            )} sn`}
                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </div>

          <button
            className="back-button"
            type="button"
            onClick={goHome}
          >
            ← GERİ
          </button>

        </main>
      </div>
    );
  }

  return null;
}

export default App;