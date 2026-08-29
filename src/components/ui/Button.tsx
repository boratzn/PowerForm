import { Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = PressableProps & {
  label: string;
  variant?: Variant;
};

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent active:opacity-80',
  secondary: 'bg-bg-elevated active:opacity-80',
  ghost: 'bg-transparent active:opacity-60',
  danger: 'bg-danger active:opacity-80',
};

const labelClasses: Record<Variant, string> = {
  primary: 'text-bg-primary',
  secondary: 'text-text-primary',
  ghost: 'text-text-primary',
  danger: 'text-bg-primary',
};

// Dokunma hedefi min 48dp (§10.2 kural 2) — terli parmak, küçük buton = hata.
export function Button({ label, variant = 'primary', className, ...props }: ButtonProps & { className?: string }) {
  return (
    <Pressable
      className={`min-h-[48px] items-center justify-center rounded-card px-lg ${variantClasses[variant]} ${className ?? ''}`}
      {...props}
    >
      <Text className={`text-base font-semibold ${labelClasses[variant]}`}>{label}</Text>
    </Pressable>
  );
}
