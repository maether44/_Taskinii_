import React from 'react';
import { TouchableOpacity, Image, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../data/trainingData';

export default function MachineCard({ machine, onPress }) {
  return (
    <TouchableOpacity style={s.card} onPress={() => onPress(machine)} activeOpacity={0.82}>
      {machine.imageUrl ? (
        <Image source={{ uri: machine.imageUrl }} style={s.bg} resizeMode="cover" />
      ) : (
        <LinearGradient colors={['#1A1535', '#0F0B1E']} style={s.bg} />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.05)', 'rgba(8,4,24,0.92)']}
        style={[s.bg, { position: 'absolute' }]}
      />
      <View style={[s.badge, machine.isHome ? s.badgeHome : s.badgeGym]}>
        <Ionicons name={machine.isHome ? 'home-outline' : 'barbell-outline'} size={9} color="#fff" />
        <Text style={s.badgeTxt}>{machine.isHome ? 'HOME' : 'GYM'}</Text>
      </View>
      <View style={s.iconWrap}>
        <Ionicons name={machine.icon} size={26} color={C.lime} />
      </View>
      <View style={s.bottom}>
        <Text style={s.name}>{machine.name}</Text>
        <Text style={s.muscle}>{machine.primaryMuscle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    width: 148, height: 195, borderRadius: 20, overflow: 'hidden',
    marginRight: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  bg: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
  badge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  badgeGym:  { backgroundColor: 'rgba(124,92,252,0.7)' },
  badgeHome: { backgroundColor: 'rgba(200,241,53,0.35)' },
  badgeTxt: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  iconWrap: {
    position: 'absolute', top: '38%', alignSelf: 'center', left: '50%', marginLeft: -22,
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  bottom: { position: 'absolute', bottom: 14, left: 12, right: 12 },
  name: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  muscle: { color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 2 },
});
