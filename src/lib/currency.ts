type WorkspaceLike = {
  defaultCurrency?: string | null;
};

export function getWorkspaceCurrency(workspace?: WorkspaceLike | null) {
  return workspace?.defaultCurrency?.trim() || "MXN";
}
