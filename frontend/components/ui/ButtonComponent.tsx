import { TouchableOpacity, ActivityIndicator } from "react-native";
import { ThemedText } from "./ThemedText";
import { IconSymbol } from "./icon-symbol";

type Variant = "primary" | "success" | "error";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof IconSymbol>["name"];
  variant?: Variant;
};

const variantClass: Record<Variant, string> = {
  primary: "bg-primary",
  success: "bg-success",
  error: "bg-error",
};

export function ButtonComponent({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon = "wallet.pass.fill",
  variant = "primary",
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={`w-full ${variantClass[variant]} py-4 rounded-xl flex-row justify-center items-center gap-2 mb-4 ${disabled || loading ? "opacity-50" : ""}`}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <IconSymbol name={icon} size={20} color="#ffffff" />
      )}
      <ThemedText className="text-white font-semibold text-lg">{label}</ThemedText>
    </TouchableOpacity>
  );
}
