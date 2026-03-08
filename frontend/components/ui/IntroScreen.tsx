import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/ThemedText';
import { GradientButton } from '@/components/ui/GradientButton';

const { width } = Dimensions.get('window');

type Step = {
    image: any;
    title: string;
    description: string;
};

const STEPS: Step[] = [
    {
        image: require('@/assets/images/coin.png'),
        title: 'Send Crypto.\nSimply.',
        description: 'Pay your family using SOL or USDC —\nas easy as sending money on UPI.',
    },
    {
        image: require('@/assets/images/ai-illustration.png'),
        title: 'Just Say It.\nWe Send It.',
        description: 'Type or say “Send $50 to Mom.”\nWe handle everything behind the scenes.',
    },
    {
        image: require('@/assets/images/vault-secure.png'),
        title: 'Secure. Private.\nYours.',
        description: 'Your wallet stays in your control.\nWe never access or hold your funds.',
    },
];

type Props = {
    onFinish: () => void;
};

export function IntroScreen({ onFinish }: Props) {
    const [currentIdx, setCurrentIdx] = useState(0);

    const handleNext = () => {
        if (currentIdx < STEPS.length - 1) {
            setCurrentIdx(currentIdx + 1);
        } else {
            onFinish();
        }
    };

    const step = STEPS[currentIdx];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Skip Button */}
            <TouchableOpacity
                onPress={onFinish}
                activeOpacity={0.7}
                style={styles.skipBtn}
            >
                <LinearGradient
                    colors={['#A78BFA', '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.skipBtnInner}
                >
                    <ThemedText style={styles.skipText}>Skip</ThemedText>
                </LinearGradient>
            </TouchableOpacity>

            <View style={styles.content}>
                {/* Illustration */}
                <View style={styles.imageContainer}>
                    <Image
                        source={step.image}
                        style={styles.image}
                        resizeMode="contain"
                    />
                </View>

                {/* Text */}
                <View style={styles.textContainer}>
                    <ThemedText style={styles.title}>{step.title}</ThemedText>
                    <ThemedText variant="muted" style={styles.description}>
                        {step.description}
                    </ThemedText>
                </View>

                {/* Step Indicators */}
                <View style={styles.indicatorRow}>
                    {STEPS.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                currentIdx === i ? styles.dotActive : styles.dotInactive,
                            ]}
                        />
                    ))}
                </View>
            </View>

            {/* Footer Button */}
            <View style={styles.footer}>
                <GradientButton
                    label={currentIdx === STEPS.length - 1 ? 'Get Started' : 'Next'}
                    onPress={handleNext}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    skipBtn: {
        position: 'absolute',
        top: 60,
        right: 24,
        zIndex: 10,
    },
    skipBtnInner: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    skipText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 0.2,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    imageContainer: {
        width: width * 0.8,
        height: width * 0.8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        fontFamily: 'Poppins_700Bold',
        textAlign: 'center',
        color: '#000',
        lineHeight: 40,
    },
    description: {
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        color: '#666',
        lineHeight: 24,
        marginTop: 8,
    },
    indicatorRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 48,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    dotActive: {
        width: 24,
        backgroundColor: '#8B5CF6',
    },
    dotInactive: {
        width: 6,
        backgroundColor: '#E5E7EB',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
});
