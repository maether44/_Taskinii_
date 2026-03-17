const express = require("express");
const supabase = require("../Configuration/supabase");
const { authMiddleware, adminMiddleware } = require("../Middleware/auth");
const router = express.Router();

// ── WORKOUTS ──────────────────────────────────────

// Get workouts (own or all if admin)
router.get("/workouts", authMiddleware, async (req, res) => {
  try {
    let query = supabase.from("workouts").select("*, users(name, email)");
    if (!req.user.is_admin) query = query.eq("user_id", req.user.id);

    const { data, error } = await query.order("date", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch workouts" });
  }
});

// Add workout
router.post("/workouts", authMiddleware, async (req, res) => {
  const { title, exercises, date } = req.body;
  try {
    const { data, error } = await supabase
      .from("workouts")
      .insert([{ user_id: req.user.id, title, exercises, date }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to add workout" });
  }
});

// ── NUTRITION ─────────────────────────────────────

router.get("/nutrition", authMiddleware, async (req, res) => {
  try {
    let query = supabase.from("nutrition").select("*, users(name, email)");
    if (!req.user.is_admin) query = query.eq("user_id", req.user.id);

    const { data, error } = await query.order("date", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch nutrition" });
  }
});

router.post("/nutrition", authMiddleware, async (req, res) => {
  const { meal_name, calories, protein, carbs, fats, date } = req.body;
  try {
    const { data, error } = await supabase
      .from("nutrition")
      .insert([{ user_id: req.user.id, meal_name, calories, protein, carbs, fats, date }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to add nutrition" });
  }
});

// ── MEASUREMENTS ──────────────────────────────────

router.get("/measurements", authMiddleware, async (req, res) => {
  try {
    let query = supabase.from("measurements").select("*, users(name, email)");
    if (!req.user.is_admin) query = query.eq("user_id", req.user.id);

    const { data, error } = await query.order("date", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch measurements" });
  }
});

router.post("/measurements", authMiddleware, async (req, res) => {
  const { weight, height, bmi, chest, waist, hips, date } = req.body;
  try {
    const { data, error } = await supabase
      .from("measurements")
      .insert([{ user_id: req.user.id, weight, height, bmi, chest, waist, hips, date }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to add measurement" });
  }
});

// ── PROGRESS PHOTOS ───────────────────────────────

router.get("/photos", authMiddleware, async (req, res) => {
  try {
    let query = supabase.from("progress_photos").select("*, users(name, email)");
    if (!req.user.is_admin) query = query.eq("user_id", req.user.id);

    const { data, error } = await query.order("date", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

router.post("/photos", authMiddleware, async (req, res) => {
  const { photo_url, note, date } = req.body;
  try {
    const { data, error } = await supabase
      .from("progress_photos")
      .insert([{ user_id: req.user.id, photo_url, note, date }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to add photo" });
  }
});

// ── ADMIN ONLY: all users list ─────────────────────

router.get("/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, is_admin, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

module.exports = router;