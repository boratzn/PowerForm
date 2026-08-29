import { TextInput, type TextInputProps } from 'react-native';

export function Input({ className, ...props }: TextInputProps & { className?: string }) {
  return (
    <TextInput
      className={`min-h-[48px] rounded-input bg-bg-elevated px-md text-base text-text-primary ${className ?? ''}`}
      placeholderTextColor="#8A97A6"
      {...props}
    />
  );
}
