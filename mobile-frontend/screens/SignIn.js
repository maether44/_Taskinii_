import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import AuthLayout from "../components/AuthLayout";
import Input from "../components/Input";
import Button from "../components/Button";
import { Mail, Lock, LogIn } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../database/supabase";

const SignIn = () => {
  const navigation = useNavigation();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Sign In Error", error.message);
    } else {
      Alert.alert("Success", "Welcome back!");
      navigation.navigate("Profile");
    }
  };

  return (
    <AuthLayout>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>
          Sign in to continue your fitness journey
        </Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          rules={{ required: "Email is required" }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="Enter your email"
              onBlur={onBlur}
              autoCapitalize={'none'}
              onChangeText={onChange}
              value={value}
              icon={Mail}
              error={errors.email?.message}
            />
          )}
          name="email"
        />

        <Controller
          control={control}
          rules={{ required: "Password is required" }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              placeholder="Enter your password"
              onBlur={onBlur}
              onChangeText={onChange}
              autoCapitalize={'none'}
              value={value}
              secureTextEntry
              icon={Lock}
              error={errors.password?.message}
            />
          )}
          name="password"
        />

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <Button
          title={loading ? "Signing In..." : "Sign In"}
          onPress={handleSubmit(onSubmit)}
          icon={LogIn}
          disabled={loading}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.link}>Sign Up</Text>
          </Pressable>
        </View>
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#A38DF2",
    fontSize: 14,
    fontFamily: "Outfit-Medium",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
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

export default SignIn;
