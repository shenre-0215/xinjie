import { create } from "zustand";

type ConfirmStore = {
  open: boolean;
  message: string;
  resolve: ((value: boolean) => void) | null;
  ask: (message: string) => Promise<boolean>;
  close: (result: boolean) => void;
};

export const useConfirm = create<ConfirmStore>((set, get) => ({
  open: false,
  message: "",
  resolve: null,
  ask: (message: string) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, message, resolve });
    }),
  close: (result: boolean) => {
    const { resolve } = get();
    if (resolve) resolve(result);
    set({ open: false, message: "", resolve: null });
  },
}));
