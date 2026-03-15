import React, { useState } from 'react';
import { Apple, Plus, Droplets, X } from 'lucide-react';
import { PageContainer, Card } from '../components/ui';

export default function NutritionPage() {
  const dailyGoal = 2200;
  const [meals, setMeals] = useState([
    {
      id: 1,
      mealType: 'Breakfast',
      totalCalories: 420,
      items: [
        { name: 'Oatmeal', calories: 250 },
        { name: 'Banana', calories: 170 },
      ],
    },
    {
      id: 2,
      mealType: 'Lunch',
      totalCalories: 620,
      items: [
        { name: 'Grilled chicken', calories: 350 },
        { name: 'Rice', calories: 270 },
      ],
    },
    {
      id: 3,
      mealType: 'Dinner',
      totalCalories: 310,
      items: [
        { name: 'Salad', calories: 200 },
        { name: 'Olive oil', calories: 110 },
      ],
    },
    {
      id: 4,
      mealType: 'Snacks',
      totalCalories: 100,
      items: [
        { name: 'Yogurt', calories: 100 },
      ],
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [formData, setFormData] = useState({
    foodName: '',
    servingSize: '',
    calories: '',
  });

  // Calculate totals
  const totalCaloriesConsumed = meals.reduce((sum, meal) => sum + meal.totalCalories, 0);
  const remainingCalories = dailyGoal - totalCaloriesConsumed;
  const caloriePercentage = (totalCaloriesConsumed / dailyGoal) * 100;

  // Calculate macros (mock data based on consumed calories)
  const protein = 110;
  const carbs = 210;
  const fats = 65;

  const handleAddFood = (mealType) => {
    setSelectedMealType(mealType);
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'calories' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSubmitFood = () => {
    if (!formData.foodName || !formData.calories) {
      alert('Please fill in all fields');
      return;
    }

    const mealIndex = meals.findIndex((m) => m.mealType === selectedMealType);
    if (mealIndex !== -1) {
      const updatedMeals = [...meals];
      updatedMeals[mealIndex].items.push({
        name: formData.foodName,
        calories: formData.calories,
      });
      updatedMeals[mealIndex].totalCalories += formData.calories;
      setMeals(updatedMeals);
    }

    setFormData({ foodName: '', servingSize: '', calories: '' });
    setShowModal(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ foodName: '', servingSize: '', calories: '' });
  };

  // Circular Progress Indicator Component
  const CircularProgress = ({ percentage, consumed, goal }) => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ position: 'relative', width: 200, height: 200 }}>
          <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{consumed}</div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>kcal</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
              of {goal} kcal
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-accent-lime)' }}>
            {remainingCalories} kcal remaining
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
            {percentage.toFixed(1)}% of daily goal
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageContainer title="Nutrition" subtitle="Track your daily intake and macro summary.">
      {/* Daily Calorie Overview */}
      <Card title="Daily Calorie Overview" style={{ marginBottom: '2rem' }}>
        <CircularProgress percentage={caloriePercentage} consumed={totalCaloriesConsumed} goal={dailyGoal} />
      </Card>

      {/* Meal Breakdown */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Meal Breakdown</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {meals.map((meal) => (
            <Card key={meal.id} title={`${meal.mealType} (${meal.totalCalories} kcal)`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                {meal.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>{item.name}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-accent-lime)' }}>{item.calories} kcal</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleAddFood(meal.mealType)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(111, 75, 242, 0.1)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: '8px',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(111, 75, 242, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(111, 75, 242, 0.1)';
                }}
              >
                <Plus size={18} />
                Add Food
              </button>
            </Card>
          ))}
        </div>
      </div>

      {/* Daily Nutrition Summary */}
      <Card title="Daily Nutrition Summary">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(111, 75, 242, 0.1)',
              border: '1px solid rgba(111, 75, 242, 0.3)',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Protein</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-accent-lime)' }}>{protein}g</div>
          </div>
          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(111, 75, 242, 0.1)',
              border: '1px solid rgba(111, 75, 242, 0.3)',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Carbs</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-accent-lime)' }}>{carbs}g</div>
          </div>
          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(111, 75, 242, 0.1)',
              border: '1px solid rgba(111, 75, 242, 0.3)',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Fats</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-accent-lime)' }}>{fats}g</div>
          </div>
        </div>
      </Card>

      {/* Add Food Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: 'var(--color-background)',
              borderRadius: '16px',
              padding: '2rem',
              width: '90%',
              maxWidth: '400px',
              border: '1px solid rgba(111, 75, 242, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Add Food to {selectedMealType}</h3>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                }}
              >
                <X size={24} />
              </button>
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                  Food Name
                </label>
                <input
                  type="text"
                  name="foodName"
                  value={formData.foodName}
                  onChange={handleFormChange}
                  placeholder="e.g., Chicken Breast"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(111, 75, 242, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                  Serving Size (Optional)
                </label>
                <input
                  type="text"
                  name="servingSize"
                  value={formData.servingSize}
                  onChange={handleFormChange}
                  placeholder="e.g., 100g, 1 cup"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(111, 75, 242, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                  Calories
                </label>
                <input
                  type="number"
                  name="calories"
                  value={formData.calories}
                  onChange={handleFormChange}
                  placeholder="e.g., 250"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(111, 75, 242, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleSubmitFood}
                style={{
                  padding: '0.75rem',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  marginTop: '0.5rem',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '1';
                }}
              >
                Add Food
              </button>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}