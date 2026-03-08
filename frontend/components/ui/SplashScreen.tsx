import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export function SplashScreen() {
    return (
        <View style={styles.container}>
            <Image
                source={require('@/assets/images/amypay-logo.png')}
                style={styles.logo}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 200,
        height: 200,
    },
});
