"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket/types";

export type ConnectionStatus = "connecting" | "live" | "offline";

type SocketContextValue = {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  status: ConnectionStatus;
  joinEventRoom: (
    eventId: string,
    role?: "judge" | "organizer" | "viewer",
  ) => Promise<{ ok: boolean; error?: string }>;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children, code }: { children: ReactNode; code?: string }) {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
    const s: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, {
      query: code ? { code } : undefined,
      withCredentials: true,
    });
    socketRef.current = s;

    const onConnect = () => {
      setSocket(s);
      setStatus("live");
    };
    const onDisconnect = () => setStatus("offline");
    const onConnectError = () => setStatus("offline");

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);
      s.disconnect();
      if (socketRef.current === s) socketRef.current = null;
      setSocket(null);
      setStatus("connecting");
    };
  }, [code]);

  const joinEventRoom = useCallback<SocketContextValue["joinEventRoom"]>(
    async (eventId, role = "viewer") => {
      const s = socketRef.current;
      if (!s) return { ok: false, error: "Socket not connected" };
      return new Promise<{ ok: boolean; error?: string }>((resolve) => {
        const timer = setTimeout(() => resolve({ ok: false, error: "Timed out" }), 5000);
        s.emit("join_event_room", { eventId, role, code }, (ack) => {
          clearTimeout(timer);
          resolve(ack);
        });
      });
    },
    [code],
  );

  const value = useMemo(() => ({ socket, status, joinEventRoom }), [socket, status, joinEventRoom]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within a SocketProvider");
  return ctx;
}
