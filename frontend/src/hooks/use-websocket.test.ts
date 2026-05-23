import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useWebSocket } from "./use-websocket";

interface MockWebSocket {
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  readyState: number;
  onopen: ((e: Event) => void) | null;
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onclose: (() => void) | null;
}

let mockWs: MockWebSocket;
let WsMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  mockWs = {
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1, // WebSocket.OPEN
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
  };
  // Use a regular function so `new WebSocket()` works (arrow fns can't be constructors)
  WsMock = vi.fn(function MockWS() {
    return mockWs;
  });
  vi.stubGlobal("WebSocket", WsMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function openConnection() {
  act(() => {
    mockWs.onopen?.(new Event("open"));
  });
}

function sendMessage(data: object) {
  act(() => {
    mockWs.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  });
}

function closeConnection() {
  act(() => {
    mockWs.onclose?.();
  });
}

describe("useWebSocket — auth error stops reconnect", () => {
  it("does not reconnect after Invalid token error", () => {
    renderHook(() =>
      useWebSocket({ url: "ws://localhost:1234", token: "stale-token" }),
    );
    openConnection();
    sendMessage({ type: "error", message: "Invalid token" });
    closeConnection();
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Constructor called once on initial connect, never again for reconnect
    expect(WsMock).toHaveBeenCalledTimes(1);
  });

  it("does not reconnect after Authentication required error", () => {
    renderHook(() =>
      useWebSocket({ url: "ws://localhost:1234", token: "bad-token" }),
    );
    openConnection();
    sendMessage({ type: "error", message: "Authentication required" });
    closeConnection();
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(WsMock).toHaveBeenCalledTimes(1);
  });

  it("does reconnect after non-auth error", () => {
    renderHook(() =>
      useWebSocket({ url: "ws://localhost:1234", token: "good-token" }),
    );
    openConnection();
    sendMessage({ type: "error", message: "Internal server error" });
    closeConnection();
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Second WebSocket constructed — reconnect happened
    expect(WsMock.mock.calls.length).toBeGreaterThan(1);
  });
});
