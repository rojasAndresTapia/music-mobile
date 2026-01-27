import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../styles/theme';

interface PlayButtonsProps {
  onPlayAll: () => void;
  onShuffle: () => void;
  isLoading?: boolean;
  isShuffled?: boolean;
}

/**
 * Reusable component for Play All and Shuffle buttons
 * Used in album detail screens
 */
export const PlayButtons: React.FC<PlayButtonsProps> = ({
  onPlayAll,
  onShuffle,
  isLoading = false,
  isShuffled = false,
}) => {
  // Debug log to verify state and force re-render check
  React.useEffect(() => {
    console.log('🔀 [PlayButtons] Component rendered with shuffle state:', {
      isShuffled,
      backgroundColor: isShuffled ? Colors.shuffleActive : Colors.shuffleInactive,
      borderWidth: isShuffled ? 3 : 0,
      shuffleActiveColor: Colors.shuffleActive,
      shuffleInactiveColor: Colors.shuffleInactive,
    });
  }, [isShuffled]);
  
  // Force a visual test - log the actual computed style
  const shuffleButtonStyle = isShuffled ? styles.shuffleButtonActive : styles.shuffleButtonInactive;
  React.useEffect(() => {
    console.log('🔀 [PlayButtons] Computed button style:', {
      isShuffled,
      styleKeys: Object.keys(shuffleButtonStyle),
      backgroundColor: (shuffleButtonStyle as any).backgroundColor,
      borderWidth: (shuffleButtonStyle as any).borderWidth,
      borderColor: (shuffleButtonStyle as any).borderColor,
    });
  }, [isShuffled, shuffleButtonStyle]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.playAllButton]}
        onPress={onPlayAll}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonIcon}>▶️</Text>
        <Text style={styles.buttonText}>Play All</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          isShuffled ? styles.shuffleButtonActive : styles.shuffleButtonInactive,
          // Force style update with inline style as fallback
          isShuffled && {
            backgroundColor: Colors.shuffleActive,
            borderWidth: 3,
            borderColor: Colors.shuffleActiveBorder,
          },
          !isShuffled && {
            backgroundColor: Colors.shuffleInactive,
            borderWidth: 0,
          },
        ]}
        onPress={onShuffle}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.buttonContent}>
          <Text style={[
            styles.buttonIcon,
            isShuffled && styles.buttonIconActive
          ]}>
            🔀
          </Text>
          <Text style={[
            styles.buttonText,
            !isShuffled && styles.buttonTextInactive
          ]}>
            {isShuffled ? 'Shuffling' : 'Shuffle'}
          </Text>
        </View>
        {isShuffled && (
          <View style={styles.activeIndicator} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    position: 'relative',
  },
  playAllButton: {
    backgroundColor: Colors.primary,
    ...Shadows.primary,
  },
  shuffleButtonActive: {
    backgroundColor: Colors.shuffleActive,
    ...Shadows.shuffle,
    borderWidth: 3, // Thicker border for more visibility
    borderColor: Colors.shuffleActiveBorder,
    opacity: 1,
  },
  shuffleButtonInactive: {
    backgroundColor: Colors.shuffleInactive,
    ...Shadows.small,
    borderWidth: 0, // No border when inactive for clear contrast
    borderColor: Colors.shuffleInactiveBorder,
  },
  buttonIcon: {
    fontSize: Typography.sizes.lg,
    marginRight: Spacing.sm,
  },
  buttonIconActive: {
    transform: [{ scale: 1.1 }],
  },
  buttonText: {
    color: Colors.textWhite,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  buttonTextInactive: {
    color: Colors.textInactive,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.textWhite,
    borderWidth: 2,
    borderColor: Colors.shuffleActiveBorder,
  },
});
