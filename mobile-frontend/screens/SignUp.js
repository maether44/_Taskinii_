import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import AuthLayout from "../components/AuthLayout";
import Input from "../components/Input";
import Button from "../components/Button";
import { Mail, Lock, User, UserPlus } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../database/supabase";

const SignUp = () => {
  const navigation = useNavigation();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState(false);

  const password = watch("password");

  const onSubmit = async (data) => {
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    console.log("Auth Data:", authData);
    console.log("Auth Error:", error);

    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      return;
    }

    // Create profile in profiles table
    if (authData.user) {
      console.log("✅ User created with ID:", authData.user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: authData.user.id,
            email: data.email,
            username: data.fullName,
          },
        ])
        .select();

      if (profileError) {
        console.error("❌ Profile creation error:", profileError);
      } else {
        console.log("✅ New profile created in database:", profileData);
      }
    }

    setLoading(false);

    if (!authData.session) {
      Alert.alert(
        "Success!",
        "Please check your inbox for email verification.",
      );
    } else {
      Alert.alert("Success!", "Account created successfully!");
      navigation.navigate("Profile");
    }
  };

  return (
    <AuthLayout>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the revolution in fitness</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            rules={{ required: "Full Name is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Userame"
                placeholder="Enter your full name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                icon={User}
                error={errors.fullName?.message}
              />
            )}
            name="fullName"
          />

          <Controller
            control={control}
            rules={{
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="Enter your email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                icon={Mail}
                error={errors.email?.message}
              />
            )}
            name="email"
          />

          <Controller
            control={control}
            rules={{
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Create a password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                autoCapitalize="none"
                icon={Lock}
                error={errors.password?.message}
              />
            )}
            name="password"
          />

          <Controller
            control={control}
            rules={{
              required: "Please confirm your password",
              validate: (value) =>
                value === password || "Passwords do not match",
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                autoCapitalize="none"
                icon={Lock}
                error={errors.confirmPassword?.message}
              />
            )}
            name="confirmPassword"
          />

          <Button
            icon={UserPlus}
            title={loading ? "Signing up..." : "Sign Up"}
            disabled={loading}
            onPress={handleSubmit(onSubmit)}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate("SignIn")}>
              <Text style={styles.link}>Sign In</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
    fontFamily: "Outfit-Bold",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    fontFamily: "Outfit-Regular",
  },
  form: {
    width: "100%",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 24,
  },
  footerText: {
    color: "white",
    fontSize: 14,
    fontFamily: "Outfit-Regular",
  },
  link: {
    color: "#CDF27E",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Outfit-Bold",
  },
});

export default SignUp;
