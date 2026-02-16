
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const Button = ({ onPress, title, variant = 'primary', icon: Icon, disabled }) => {
    const isPrimary = variant === 'primary';

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[styles.container, disabled && styles.disabled]}
            disabled={disabled}
        >
            {isPrimary ? (
                <LinearGradient
                    colors={['#6F4BF2', '#A38DF2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                >
                    {Icon && <Icon size={20} color="white" style={styles.icon} />}
                    <Text style={styles.text}>{title}</Text>
                </LinearGradient>
            ) : (
                <BlurView intensity={20} tint="light" style={styles.blur}>
                    {Icon && <Icon size={20} color="white" style={styles.icon} />}
                    <Text style={styles.text}>{title}</Text>
                </BlurView>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        marginVertical: 8,
        overflow: 'hidden',
        shadowColor: '#6F4BF2',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    disabled: {
        opacity: 0.6,
    },
    gradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    blur: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    text: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Outfit-SemiBold', // Assuming font is loaded
    },
    icon: {
        marginRight: 8,
    },
});

export default Button;