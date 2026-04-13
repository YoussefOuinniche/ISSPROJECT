import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

export type EvolutionState = 'new' | 'updated' | 'confirmed';

export interface EvolvingTrait {
  id: string;
  category: 'skill' | 'goal' | 'interest' | 'experience';
  label: string;
  state: EvolutionState;
}

interface ProfileEvolvingCardProps {
  traits: EvolvingTrait[];
}

export function ProfileEvolvingCard({ traits }: ProfileEvolvingCardProps) {
  if (!traits || traits.length === 0) return null;

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'skill': return 'cpu';
      case 'goal': return 'crosshair';
      case 'interest': return 'heart';
      case 'experience': return 'briefcase';
      default: return 'star';
    }
  };

  const getStateStyle = (state: EvolutionState) => {
    switch (state) {
      case 'new':
        return { color: Colors.primary, bg: Colors.primary + '15', icon: 'zap' as const };
      case 'updated':
        // using accent as a fallback for 'secondary' which does not exist
        return { color: Colors.accent, bg: Colors.accent + '15', icon: 'refresh-cw' as const };
      case 'confirmed':
        return { color: Colors.success, bg: Colors.success + '15', icon: 'check-circle' as const };
      default:
        return { color: Colors.textSecondary, bg: Colors.surface, icon: 'circle' as const };
    }
  };

  return (
    <Animated.View 
      entering={FadeInUp.delay(200).springify()} 
      layout={Layout.springify()} 
      style={styles.card}
    >
      <LinearGradient 
        colors={[Colors.surface, Colors.backgroundSecondary]} 
        style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
      />
      
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="zap" size={20} color={Colors.primary} />
          <Text style={styles.title}>Your Profile is Evolving</Text>
        </View>
        <Text style={styles.subtitle}>
          The AI assistant is learning from your conversations.
        </Text>
      </View>

      <View style={styles.list}>
        {traits.map((trait, index) => {
          const stateConfig = getStateStyle(trait.state);
          return (
            <Animated.View 
              key={trait.id} 
              entering={FadeInUp.delay(300 + index * 100).springify()}
              style={styles.traitItem}
            >
              <View style={styles.traitLeft}>
                <View style={styles.categoryIcon}>
                  <Feather name={getIconForCategory(trait.category)} size={16} color={Colors.textSecondary} />
                </View>
                <Text style={styles.traitLabel} numberOfLines={1}>{trait.label}</Text>
              </View>
              
              <View style={[styles.stateBadge, { backgroundColor: stateConfig.bg }]}>
                <Feather name={stateConfig.icon} size={12} color={stateConfig.color} />
                <Text style={[styles.stateText, { color: stateConfig.color }]}>
                  {trait.state}
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.trustFooter}>
        <Feather name="shield" size={14} color={Colors.textSecondary} />
        <Text style={styles.trustNotes}>
          Review AI-detected insights before using them for recommendations
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    marginLeft: 28,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  traitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  traitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  traitLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.textPrimary,
    flex: 1,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stateText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
  },
  trustNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
});
