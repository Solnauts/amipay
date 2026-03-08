import React from 'react';
import {
    Modal,
    View,
    TouchableOpacity,
    Image,
    StyleSheet,
    FlatList,
    Dimensions,
} from 'react-native';

import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { AVATARS } from '@/assets/avatars';
import { Colors } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = (width - 64 - (COLUMN_COUNT - 1) * 16) / COLUMN_COUNT;

type Props = {
    visible: boolean;
    onClose: () => void;
    selectedIndex: number;
    onSelect: (index: number) => void;
    colorScheme: 'light' | 'dark';
};

export function AvatarPickerModal({
    visible,
    onClose,
    selectedIndex,
    onSelect,
    colorScheme,
}: Props) {
    const colors = Colors[colorScheme];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>

                <ThemedView
                    variant="surface"
                    style={[
                        styles.container,
                        { borderColor: colors.border, backgroundColor: colorScheme === 'dark' ? '#1e1e2e' : '#ffffff' }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <ThemedText type="subtitle">Choose Avatar</ThemedText>
                        <TouchableOpacity onPress={onClose} hitSlop={10}>
                            <MaterialIcons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Grid */}
                    <FlatList
                        data={AVATARS}
                        numColumns={COLUMN_COUNT}
                        keyExtractor={(_, index) => index.toString()}
                        columnWrapperStyle={{ gap: 16, marginBottom: 16 }}
                        renderItem={({ item, index }) => {
                            const isSelected = index === selectedIndex;
                            return (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        onSelect(index);
                                        onClose();
                                    }}
                                    style={[
                                        styles.avatarWrapper,
                                        {
                                            width: ITEM_SIZE,
                                            height: ITEM_SIZE,
                                            borderColor: isSelected ? '#8B5CF6' : 'transparent',
                                            borderWidth: isSelected ? 3 : 0,
                                        },
                                    ]}
                                >
                                    <Image source={item} style={styles.avatarImage} />
                                    {isSelected && (
                                        <View style={styles.checkBadge}>
                                            <MaterialIcons name="check" size={12} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </ThemedView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxHeight: '60%',
        borderRadius: 24,
        borderWidth: 1,
        padding: 20,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    listContent: {
        paddingBottom: 10,
    },
    avatarWrapper: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 8,
        position: 'relative',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    checkBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: '#8B5CF6',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
});
