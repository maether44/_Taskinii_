import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getProfile } from '../../services/profileService';
import { getFriendInvite, respondToFriendInvite } from '../../services/friendInviteService';

export default function FriendInvite({ route, navigation }) {
  const { user } = useAuth();
  const inviterId = route?.params?.ref;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviterName, setInviterName] = useState('A BodyQ user');
  const [inviteStatus, setInviteStatus] = useState('pending');

  useEffect(() => {
    let mounted = true;

    async function loadInvite() {
      if (!inviterId || !user?.id) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const [profile, invite] = await Promise.all([
          getProfile(inviterId),
          getFriendInvite({ inviterId, inviteeId: user.id }),
        ]);

        if (!mounted) return;

        if (profile?.full_name) setInviterName(profile.full_name);
        if (invite?.status) setInviteStatus(invite.status);
      } catch (error) {
        if (mounted) {
          Alert.alert('Invite error', error?.message || 'Could not load this invitation.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadInvite();
    return () => {
      mounted = false;
    };
  }, [inviterId, user?.id]);

  const onRespond = async (decision) => {
    if (!inviterId || !user?.id || submitting) return;
    if (inviterId === user.id) {
      Alert.alert('Invalid invite', 'You cannot invite yourself.');
      return;
    }

    setSubmitting(true);
    try {
      const row = await respondToFriendInvite({
        inviterId,
        inviteeId: user.id,
        decision,
      });

      setInviteStatus(row?.status || decision);
      Alert.alert(
        decision === 'accepted' ? 'Invitation accepted' : 'Invitation rejected',
        decision === 'accepted'
          ? `You are now connected with ${inviterName}.`
          : 'You declined this friend invitation.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MainApp'),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Action failed', error?.message || 'Could not update invitation status.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.rootCentered}>
        <ActivityIndicator size="large" color="#C8F135" />
      </View>
    );
  }

  if (!user?.id) {
    return (
      <View style={styles.rootCentered}>
        <Text style={styles.title}>Sign in required</Text>
        <Text style={styles.sub}>Please sign in to respond to this invitation.</Text>
      </View>
    );
  }

  if (!inviterId) {
    return (
      <View style={styles.rootCentered}>
        <Text style={styles.title}>Invalid invite link</Text>
        <Text style={styles.sub}>This invitation link is missing required details.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate('MainApp')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Friend Invitation</Text>
        <View style={styles.backBtnGhost} />
      </View>

      <View style={styles.card}>
        <Ionicons name="people-outline" size={28} color="#C8F135" />
        <Text style={styles.title}>{inviterName} invited you</Text>
        <Text style={styles.sub}>Would you like to connect as friends on BodyQ?</Text>

        {inviteStatus === 'accepted' ? (
          <View style={styles.statusPillAccepted}>
            <Text style={styles.statusTxtAccepted}>Accepted</Text>
          </View>
        ) : inviteStatus === 'rejected' ? (
          <View style={styles.statusPillRejected}>
            <Text style={styles.statusTxtRejected}>Rejected</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable
              style={[styles.rejectBtn, submitting && styles.disabledBtn]}
              onPress={() => onRespond('rejected')}
              disabled={submitting}
            >
              <Text style={styles.rejectTxt}>{submitting ? 'Please wait...' : 'Reject'}</Text>
            </Pressable>
            <Pressable
              style={[styles.acceptBtn, submitting && styles.disabledBtn]}
              onPress={() => onRespond('accepted')}
              disabled={submitting}
            >
              <Text style={styles.acceptTxt}>{submitting ? 'Please wait...' : 'Accept'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0B1E', paddingTop: 52, paddingHorizontal: 16 },
  rootCentered: {
    flex: 1,
    backgroundColor: '#0F0B1E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1A1530',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnGhost: { width: 36, height: 36 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  card: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2346',
    backgroundColor: '#17112A',
    padding: 18,
    alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  sub: {
    color: '#9A91B9',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 19,
  },
  actions: {
    width: '100%',
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#C8F135',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#120F22',
    borderWidth: 1,
    borderColor: '#2B2449',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptTxt: { color: '#130E25', fontWeight: '800' },
  rejectTxt: { color: '#C8F135', fontWeight: '700' },
  disabledBtn: { opacity: 0.7 },
  statusPillAccepted: {
    marginTop: 16,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#C8F135',
  },
  statusTxtAccepted: { color: '#130E25', fontWeight: '800' },
  statusPillRejected: {
    marginTop: 16,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2B2449',
  },
  statusTxtRejected: { color: '#C8F135', fontWeight: '800' },
});
