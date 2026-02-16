import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../database/supabase";
import Input from "../components/Input";
import Button from "../components/Button";
import {
  User,
  Mail,
  Ruler,
  Weight,
  LogOut,
  Edit2,
  Save,
} from "lucide-react-native";


export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    full_name: "",
    height: "",
    weight: "",
    avatar_url: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      // Fetch profile data from profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile({
          username: data.username || "",
          email: user.email || "",
          full_name: data.full_name || "",
          height: data.height?.toString() || "",
          weight: data.weight?.toString() || "",
          avatar_url: data.avatar_url || "",
        });
      } else {
        // No profile yet, use user email
        setProfile((prev) => ({ ...prev, email: user.email || "" }));
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setUpdating(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      const updates = {
        id: user.id,
        username: profile.username,
        full_name: profile.full_name,
        height: profile.height ? parseFloat(profile.height) : null,
        weight: profile.weight ? parseFloat(profile.weight) : null,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) throw error;

      Alert.alert("Success", "Profile updated successfully!");
      setEditing(false);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setUpdating(false);
    }
  }

  async function signOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) Alert.alert("Error", error.message);
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CDF27E" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User color="#1a1a1a" size={60} />
            </View>
          )}
          {editing && (
            <TouchableOpacity style={styles.editAvatarButton}>
              <Edit2 color="#1a1a1a" size={16} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.title}>{profile.full_name || "Your Profile"}</Text>
        <Text style={styles.subtitle}>{profile.email}</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Full Name"
          placeholder="Enter your full name"
          value={profile.full_name}
          onChangeText={(text) => setProfile({ ...profile, full_name: text })}
          icon={User}
          editable={editing}
        />

        <Input
          label="Username"
          placeholder="Enter your username"
          value={profile.username}
          onChangeText={(text) => setProfile({ ...profile, username: text })}
          icon={User}
          editable={editing}
          autoCapitalize="none"
        />

        <Input
          label="Email"
          placeholder="Your email"
          value={profile.email}
          icon={Mail}
          editable={false}
          style={styles.disabledInput}
        />

        <View style={styles.measurementsRow}>
          <View style={styles.measurementHalf}>
            <Input
              label="Height (cm)"
              placeholder="0"
              value={profile.height}
              onChangeText={(text) => setProfile({ ...profile, height: text })}
              icon={Ruler}
              keyboardType="numeric"
              editable={editing}
            />
          </View>
          <View style={styles.measurementHalf}>
            <Input
              label="Weight (kg)"
              placeholder="0"
              value={profile.weight}
              onChangeText={(text) => setProfile({ ...profile, weight: text })}
              icon={Weight}
              keyboardType="numeric"
              editable={editing}
            />
          </View>
        </View>

        {editing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setEditing(false);
                fetchProfile(); // Reset to original values
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={updateProfile}
              disabled={updating}
            >
              <Save color="#1a1a1a" size={20} style={styles.buttonIcon} />
              <Text style={styles.saveButtonText}>
                {updating ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Button
            title="Edit Profile"
            icon={Edit2}
            onPress={() => setEditing(true)}
          />
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <LogOut color="#ff4444" size={20} style={styles.buttonIcon} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 32,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#CDF27E",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#CDF27E",
    justifyContent: "center",
    alignItems: "center",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#CDF27E",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#1a1a1a",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
    fontFamily: "Outfit-Bold",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: "Outfit-Regular",
  },
  form: {
    width: "100%",
    marginBottom: 40,
  },
  measurementsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  measurementHalf: {
    flex: 1,
  },
  disabledInput: {
    opacity: 0.6,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Outfit-Bold",
  },
  saveButton: {
    backgroundColor: "#CDF27E",
  },
  saveButtonText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Outfit-Bold",
  },
  buttonIcon: {
    marginRight: 8,
  },
  signOutButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 68, 68, 0.3)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signOutText: {
    color: "#ff4444",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Outfit-Bold",
  },
});
