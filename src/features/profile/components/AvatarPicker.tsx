import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

interface AvatarPickerProps {
  avatarUrl: string | null;
  onPress: () => void;
  size?: number;
}

export function AvatarPicker({avatarUrl, onPress, size = 80}: AvatarPickerProps) {
  return (
    <Pressable onPress={onPress} testID="avatar-picker">
      <View style={[styles.container, {width: size, height: size, borderRadius: size / 2}]}>
        {avatarUrl ? (
          <Image
            source={{uri: avatarUrl}}
            style={[styles.image, {width: size, height: size, borderRadius: size / 2}]}
          />
        ) : (
          <Text style={styles.placeholder}>+</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    fontSize: 28,
    color: '#8E8E93',
    fontWeight: '300',
  },
});
