
import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Eye, EyeOff } from 'lucide-react-native';

const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    error,
    icon: Icon
}) => {
    const [isSecure, setIsSecure] = useState(secureTextEntry);
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[
                styles.inputContainer,
                isFocused && styles.focusedContainer,
                error && styles.errorContainer
            ]}>
                <BlurView intensity={10} tint="light" style={styles.blur}>
                    {Icon && <Icon size={20} color="#A38DF2" style={styles.icon} />}
                    <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        secureTextEntry={isSecure}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                    />
                    {secureTextEntry && (
                        <Eye
                            size={20}
                            color="rgba(255, 255, 255, 0.5)"
                            style={styles.eyeIcon}
                            onPress={() => setIsSecure(!isSecure)}
                        />
                    )}
                </BlurView>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        width: '100%',
    },
    label: {
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 8,
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
    },
    inputContainer: {
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    focusedContainer: {
        borderColor: '#6F4BF2',
    },
    errorContainer: {
        borderColor: '#FF4D4D',
    },
    blur: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    icon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        fontFamily: 'Outfit-Regular',
        height: '100%',
    },
    eyeIcon: {
        marginLeft: 12,
    },
    errorText: {
        color: '#FF4D4D',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
});

export default Input;