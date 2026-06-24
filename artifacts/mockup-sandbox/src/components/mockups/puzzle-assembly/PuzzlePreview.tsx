import { useState, useCallback } from "react";

const COLS = 5;
const ROWS = 4; // Pro division = 20 pieces (5×4)
const PIECE_SIZE = 52;
const BOARD_W = COLS * PIECE_SIZE; // 260px
const BOARD_H = ROWS * PIECE_SIZE; // 208px

// SVG-based abstract image split into a 5×4 grid
// Each piece is identified by its correct position (row, col)
const IMAGE_COLORS = [
  ["#7C3AED", "#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE"],
  ["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"],
  ["#059669", "#10B981", "#34D399", "#6EE7B7", "#A7F3D0"],
  ["#D97706", "#F59E0B", "#FCD34D", "#FDE68A", "#FEF3C7"],
];

// Gradient overlay pattern for each piece
function getPieceStyle(row: number, col: number): React.CSSProperties {
  const baseColor = IMAGE_COLORS[row][col];
  // Create a subtle pattern with a gradient from the base color
  const lighten = (hex: string, amt: number) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + amt);
    const g = Math.min(255, ((n >> 8) & 0xff) + amt);
    const b = Math.min(255, (n & 0xff) + amt);
    return `rgb(${r},${g},${b})`;
  };
  return {
    background: `linear-gradient(135deg, ${baseColor} 0%, ${lighten(baseColor, 40)} 100%)`,
    width: PIECE_SIZE,
    height: PIECE_SIZE,
    position: "absolute",
  };
}

// Pattern overlay (dots / lines) to make pieces look like a real puzzle fragment
function PiecePattern({ row, col }: { row: number; col: number }) {
  const shapes = [];
  // Each piece gets a unique symbol based on position
  const symbols = ["●", "▲", "■", "◆", "★"];
  const sym = symbols[(row * COLS + col) % symbols.length];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        opacity: 0.25,
        color: "#fff",
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      {sym}
    </div>
  );
}

type Piece = {
  id: string;
  correctRow: number;
  correctCol: number;
};

type SlotState = "empty" | "correct" | "wrong" | "filled";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const allPieces: Piece[] = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    allPieces.push({ id: `p${r}-${c}`, correctRow: r, correctCol: c });
  }
}

const initialTray = shuffle(allPieces);

export function PuzzlePreview() {
  // board: ROWS x COLS, each slot holds a piece id or null
  const [board, setBoard] = useState<(Piece | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [tray, setTray] = useState<Piece[]>(initialTray);
  const [selected, setSelected] = useState<Piece | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [complete, setComplete] = useState(false);

  const totalPieces = ROWS * COLS;
  const placedCount = board.flat().filter(Boolean).length;

  const handleTrayPick = useCallback(
    (piece: Piece) => {
      if (revealed) return;
      setSelected((prev) => (prev?.id === piece.id ? null : piece));
    },
    [revealed]
  );

  const handleSlotClick = useCallback(
    (row: number, col: number) => {
      if (revealed) return;
      if (!selected) return;

      const existing = board[row][col];
      if (existing) {
        // swap: put existing back in tray, place selected
        setTray((t) => [...t.filter((p) => p.id !== selected.id), existing]);
      } else {
        setTray((t) => t.filter((p) => p.id !== selected.id));
      }

      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = selected;
      setBoard(newBoard);
      setSelected(null);

      // Check if all placed
      const placed = newBoard.flat().filter(Boolean).length;
      if (placed === totalPieces) {
        setRevealed(true);
        const allCorrect = newBoard.every((rowArr, rIdx) =>
          rowArr.every((p, cIdx) => p?.correctRow === rIdx && p?.correctCol === cIdx)
        );
        setComplete(allCorrect);
      }
    },
    [board, selected, revealed, totalPieces]
  );

  const getSlotState = (row: number, col: number): SlotState => {
    const piece = board[row][col];
    if (!piece) return "empty";
    if (!revealed) return "filled";
    return piece.correctRow === row && piece.correctCol === col ? "correct" : "wrong";
  };

  const getSlotBorder = (state: SlotState) => {
    switch (state) {
      case "correct": return "2px solid #22c55e";
      case "wrong": return "2px solid #eab308";
      case "filled": return "2px solid rgba(255,255,255,0.3)";
      default: return "1px dashed rgba(255,255,255,0.2)";
    }
  };

  const getSlotOverlay = (state: SlotState) => {
    if (state === "correct") return "rgba(34,197,94,0.25)";
    if (state === "wrong") return "rgba(234,179,8,0.25)";
    return "transparent";
  };

  const reset = () => {
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setTray(shuffle(allPieces));
    setSelected(null);
    setRevealed(false);
    setComplete(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(124,58,237,0.3)",
            border: "1px solid rgba(124,58,237,0.6)",
            borderRadius: 20,
            padding: "4px 14px",
            fontSize: 12,
            color: "#C4B5FD",
            marginBottom: 8,
          }}
        >
          🧩 PUZZLE ASSEMBLY
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
          Tap a piece, then tap a slot to place it
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Reference image */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.4)",
              marginBottom: 6,
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Reference
          </div>
          <div
            style={{
              width: 80,
              height: (ROWS / COLS) * 80,
              borderRadius: 6,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.15)",
              position: "relative",
            }}
          >
            {allPieces.map((p) => (
              <div
                key={p.id}
                style={{
                  ...getPieceStyle(p.correctRow, p.correctCol),
                  width: 80 / COLS,
                  height: (80 / COLS) * (BOARD_H / BOARD_W),
                  top: p.correctRow * (80 / COLS) * (BOARD_H / BOARD_W),
                  left: p.correctCol * (80 / COLS),
                }}
              />
            ))}
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
              textAlign: "center",
            }}
          >
            {placedCount}/{totalPieces}
          </div>
          {/* Legend */}
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            {revealed && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: "#22c55e",
                    }}
                  />
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Correct</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: "#eab308",
                    }}
                  />
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Wrong slot</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Board */}
        <div>
          <div
            style={{
              position: "relative",
              width: BOARD_W,
              height: BOARD_H,
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
            }}
          >
            {Array.from({ length: ROWS }, (_, row) =>
              Array.from({ length: COLS }, (_, col) => {
                const piece = board[row][col];
                const state = getSlotState(row, col);
                const isTarget =
                  selected && !piece && state === "empty";

                return (
                  <div
                    key={`${row}-${col}`}
                    onClick={() => handleSlotClick(row, col)}
                    style={{
                      position: "absolute",
                      top: row * PIECE_SIZE,
                      left: col * PIECE_SIZE,
                      width: PIECE_SIZE,
                      height: PIECE_SIZE,
                      border: getSlotBorder(state),
                      cursor: selected ? "pointer" : "default",
                      boxSizing: "border-box",
                      transition: "all 0.15s ease",
                      background: isTarget
                        ? "rgba(124,58,237,0.2)"
                        : "transparent",
                    }}
                  >
                    {piece && (
                      <>
                        <div
                          style={{
                            ...getPieceStyle(piece.correctRow, piece.correctCol),
                            width: "100%",
                            height: "100%",
                            position: "absolute",
                          }}
                        />
                        <PiecePattern
                          row={piece.correctRow}
                          col={piece.correctCol}
                        />
                        {/* Colour feedback overlay */}
                        {revealed && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: getSlotOverlay(state),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 18,
                            }}
                          >
                            {state === "correct" ? "✓" : ""}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Tray */}
          {!revealed && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                maxWidth: BOARD_W,
                background: "rgba(0,0,0,0.2)",
                borderRadius: 8,
                padding: 8,
                minHeight: 48,
              }}
            >
              {tray.map((piece) => {
                const isActive = selected?.id === piece.id;
                return (
                  <div
                    key={piece.id}
                    onClick={() => handleTrayPick(piece)}
                    style={{
                      ...getPieceStyle(piece.correctRow, piece.correctCol),
                      position: "relative",
                      width: 36,
                      height: 36,
                      borderRadius: 4,
                      cursor: "pointer",
                      border: isActive
                        ? "2px solid #A78BFA"
                        : "2px solid transparent",
                      boxShadow: isActive
                        ? "0 0 8px rgba(167,139,250,0.8)"
                        : "none",
                      transform: isActive ? "scale(1.15)" : "scale(1)",
                      transition: "all 0.15s ease",
                      flexShrink: 0,
                    }}
                  >
                    <PiecePattern
                      row={piece.correctRow}
                      col={piece.correctCol}
                    />
                  </div>
                );
              })}
              {tray.length === 0 && (
                <div
                  style={{
                    width: "100%",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 12,
                    padding: "8px 0",
                  }}
                >
                  All pieces placed — revealing…
                </div>
              )}
            </div>
          )}

          {/* Result banner */}
          {revealed && (
            <div
              style={{
                marginTop: 12,
                borderRadius: 8,
                padding: "10px 16px",
                textAlign: "center",
                background: complete
                  ? "rgba(34,197,94,0.2)"
                  : "rgba(234,179,8,0.2)",
                border: `1px solid ${complete ? "#22c55e" : "#eab308"}`,
                fontSize: 13,
                fontWeight: 600,
                color: complete ? "#86efac" : "#fde68a",
              }}
            >
              {complete ? "🎉 Perfect! All pieces correct!" : "⚠️ Some pieces are misplaced"}
              <button
                onClick={reset}
                style={{
                  display: "block",
                  margin: "8px auto 0",
                  padding: "4px 14px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Division badges */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 20,
        }}
      >
        {[
          { label: "Div 3", pieces: 10, active: false },
          { label: "Div 2", pieces: 15, active: false },
          { label: "Pro", pieces: 20, active: true },
          { label: "Champions", pieces: 25, active: false },
        ].map((d) => (
          <div
            key={d.label}
            style={{
              padding: "4px 10px",
              borderRadius: 12,
              fontSize: 11,
              background: d.active
                ? "rgba(124,58,237,0.4)"
                : "rgba(255,255,255,0.06)",
              border: d.active
                ? "1px solid rgba(167,139,250,0.7)"
                : "1px solid rgba(255,255,255,0.1)",
              color: d.active ? "#C4B5FD" : "rgba(255,255,255,0.4)",
              fontWeight: d.active ? 700 : 400,
            }}
          >
            {d.label} · {d.pieces}
          </div>
        ))}
      </div>
    </div>
  );
}
