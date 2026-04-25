import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View, Image } from "react-native";

import { MotionPressable } from "@/components/MotionPressable";
import type { HomeCountryOption, HomeRoleOption } from "@/constants/homeIntelligence";
import Colors from "@/constants/colors";
import { alpha } from "@/constants/theme";

type HomeHeaderProps = {
  greeting: string;
  roleOptions: HomeRoleOption[];
  selectedRole: string;
  onSelectRole: (role: string) => void;
  countryOptions: HomeCountryOption[];
  selectedCountryCodes: string[];
  onToggleCountry: (code: string) => void;
  isRefreshing: boolean;
  maxCountries: number;
};

function SelectionChip({
  label,
  selected,
  icon,
  onPress,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  icon?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      containerStyle={[
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.chipDisabled,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={styles.chipInner}>
        {icon ? (
          <Feather
            color={selected ? Colors.background : Colors.textSecondary}
            name={icon as never}
            size={14}
          />
        ) : null}
        <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
      </View>
    </MotionPressable>
  );
}

export function HomeHeader({
  greeting,
  roleOptions,
  selectedRole,
  onSelectRole,
  countryOptions,
  selectedCountryCodes,
  onToggleCountry,
  isRefreshing,
  maxCountries,
}: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image 
            source={require("@/assets/images/nexapath.png")}
            style={{ width: 96, height: 38 }}
            resizeMode="contain"
          />
          <Text style={styles.greeting}>{greeting}</Text>
        </View>
      </View>

      <View style={styles.selectorBlock}>
        <View style={styles.selectorHeader}>
          <Text style={styles.selectorLabel}>Role</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.roleRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {roleOptions.map((role) => (
            <SelectionChip
              icon={role.icon}
              key={role.id}
              label={role.label}
              onPress={() => onSelectRole(role.label)}
              selected={selectedRole === role.label}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.selectorBlock}>
        <View style={styles.selectorHeader}>
          <Text style={styles.selectorLabel}>Markets</Text>
          <Text style={styles.selectorMeta}>
            {selectedCountryCodes.length}/{maxCountries} selected
          </Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.countryRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {countryOptions.map((country) => {
            const selected = selectedCountryCodes.includes(country.code);
            return (
              <SelectionChip
                key={country.code}
                label={country.shortLabel}
                onPress={() => onToggleCountry(country.code)}
                selected={selected}
              />
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  greeting: {
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.9,
    lineHeight: 32,
  },
  subline: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 240,
  },
  statusPill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillActive: {
    borderColor: alpha(Colors.accentTertiary, 0.25),
  },
  statusDot: {
    backgroundColor: Colors.textTertiary,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statusDotActive: {
    backgroundColor: Colors.accentTertiary,
  },
  statusLabel: {
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.3,
    lineHeight: 14,
    textTransform: "uppercase",
  },
  selectorBlock: {
    gap: 10,
  },
  selectorHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectorLabel: {
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  selectorMeta: {
    color: Colors.textTertiary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  roleRow: {
    gap: 10,
    paddingRight: 12,
  },
  countryRow: {
    gap: 10,
    paddingRight: 12,
  },
  chip: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: Colors.accentTertiary,
    borderColor: Colors.accentTertiary,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipInner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  chipLabel: {
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 16,
  },
  chipLabelSelected: {
    color: Colors.background,
  },
});

