import React from "react";
import {
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "./ThemedText";
import { IconSymbol } from "./icon-symbol";

type ButtonProps = {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ComponentProps<typeof IconSymbol>["name"];
};

export function ActionButton({
    label,
    onPress,
    disabled = false,
    loading = false,
    icon = "wallet.pass.fill",
}: ButtonProps) {
    return (
        <TouchableOpacity
            activeOpacity={0.92}
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.actionBtn,
                { opacity: disabled || loading ? 0.5 : 1 },
            ]}
        >
            <LinearGradient
                colors={["#A583FF", "#8154F7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradient}
            >
                {/* Inset white highlight */}
                <View style={styles.insetHighlight} />

                {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                    <>
                        <IconSymbol
                            name={icon}
                            size={20}
                            color="#ffffff"
                            style={styles.icon}
                        />

                        <ThemedText style={styles.btnText}>
                            {label}
                        </ThemedText>
                    </>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    actionBtn: {
        borderRadius: 50,

        // iOS shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 14,

        // Android shadow
        elevation: 4,
    },

    gradient: {
        height: 56,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: "#7d4bfe",
        overflow: "hidden",

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        paddingHorizontal: 28,
        paddingVertical: 16,
    },

    insetHighlight: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: "rgba(255,255,255,0.5)",
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
    },

    icon: {
        marginRight: 8,
    },

    btnText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "500",
        fontFamily: "Inter",
        textTransform: "capitalize",
    },
});