import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { JournalType } from '@/backend/types/JournalEntry';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button } from 'react-native-paper';
import { ChatModal } from '@/components/chat/ChatModal';
import { JournalModal } from '@/components/journal/JournalModal';

export default function QuickActionsBtnsBar() {
    const { colors } = useTheme();
    const [selectedJournalType, setSelectedJournalType] = useState<JournalType | null>(null);
    const [journalModalVisible, setJournalModalVisible] = useState(false);
    const [chatModalVisible, setChatModalVisible] = useState(false);

    const handleChatModalClose = () => {
        setChatModalVisible(false);
    };

    const handleJournalModalClose = () => {
        setJournalModalVisible(false);
        setSelectedJournalType(null);
    };

    return (
        <View style={[styles(colors).quickActions]}>
            <Button
                mode="contained"
                onPress={() => {
                    setSelectedJournalType(JournalType.REFLECTION);
                    setJournalModalVisible(true);
                }}
                style={[styles(colors).quickActionButton,
                { backgroundColor: colors.secondary },
                ]}
                contentStyle={{ paddingHorizontal: 2 }}
                icon="book"
                labelStyle={{ color: colors.primary, fontSize: 12 }}
                compact
            >
                Journal
            </Button>
            <Button
                mode="contained"
                onPress={() => {
                    router.push('/goals');
                }}
                style={[styles(colors).quickActionButton,
                { backgroundColor: colors.secondary },
                ]}
                contentStyle={{ paddingHorizontal: 2 }}
                icon="bullseye"
                labelStyle={{ color: colors.primary, fontSize: 12 }}
                compact
            >
                Set Goals
            </Button>
            <Button
                mode="contained"
                onPress={() => {
                    setChatModalVisible(true);
                }}
                style={[styles(colors).quickActionButton,
                { backgroundColor: colors.secondary },
                ]}
                contentStyle={{ paddingHorizontal: 2 }}
                icon="chat"
                labelStyle={{ color: colors.primary, fontSize: 12 }}
                compact
            >
                Mindset coach
            </Button>

            <JournalModal
                visible={journalModalVisible}
                onClose={handleJournalModalClose}
                initialType={selectedJournalType}
            />

            <ChatModal
                visible={chatModalVisible}
                onClose={handleChatModalClose}
                mode="mindsetCoach"
            />
        </View>
    );
}

const styles = (colors: any) => StyleSheet.create({
    quickActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8,
        marginLeft: 16,
        marginBottom: 16,
    },
    quickActionButton: {
        marginHorizontal: 4,
    }
})
