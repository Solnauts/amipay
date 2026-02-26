// components/ui/Button.tsx
import { TouchableOpacity, Text } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { IconSymbol } from "./icon-symbol";

type ButtonProps = {
label:string,
onPress:()=>void,
disabled:boolean,
}

export function ButtonComponent({ label, onPress, disabled }: ButtonProps) {
  return (
          <TouchableOpacity 
            className="w-full bg-primary py-4 rounded-xl flex-row justify-center items-center gap-2 mb-4"
            activeOpacity={0.8}
          >
            <IconSymbol name="wallet.pass.fill" size={20} color="#ffffff" />
            <ThemedText className="text-white font-semibold text-lg">
              {label}
            </ThemedText>
          </TouchableOpacity>
         
  )
}
