export interface InputProps<F, V> {
  id: string;
  field: F;
  value: V;
  error?: string;
  onChange: (next: V) => void;
}

export const helper = (error: string | undefined, help: string | undefined) => error ?? help;
