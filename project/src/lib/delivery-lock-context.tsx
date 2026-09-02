import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type DeliveryLockContextValue = {
  unlocked: boolean;
  setUnlocked: (value: boolean) => void;
  isRouteLocked: (path: string) => boolean;
};

const DeliveryLockContext = createContext<DeliveryLockContextValue | null>(null);

export function DeliveryLockProvider({ children }: { children: ReactNode }) {
  const setUnlocked = useCallback((_value: boolean) => {
    // no-op — full release is always unlocked
  }, []);

  const isRouteLocked = useCallback((_path: string) => false, []);

  const value = useMemo(
    () => ({ unlocked: true, setUnlocked, isRouteLocked }),
    [setUnlocked, isRouteLocked],
  );

  return (
    <DeliveryLockContext.Provider value={value}>{children}</DeliveryLockContext.Provider>
  );
}

export function useDeliveryLock() {
  const ctx = useContext(DeliveryLockContext);
  if (!ctx) {
    throw new Error("useDeliveryLock must be used within DeliveryLockProvider");
  }
  return ctx;
}
