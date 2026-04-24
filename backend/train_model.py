import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score
from dataset_generator import generate_medical_dataset

def train_and_evaluate():
    # Load or generate data
    if not os.path.exists('data/health_data.csv'):
        df = generate_medical_dataset()
    else:
        df = pd.read_csv('data/health_data.csv')

    # Prepare features and target
    X = df.drop('disease', axis=1)
    y = df['disease']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Initialize models
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000),
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "Support Vector Machine": SVC(probability=True, random_state=42)
    }

    best_model = None
    best_accuracy = 0
    best_model_name = ""

    print("Training models...")
    for name, model in models.items():
        model.fit(X_train, y_train)
        predictions = model.predict(X_test)
        accuracy = accuracy_score(y_test, predictions)
        print(f"{name} Accuracy: {accuracy * 100:.2f}%")

        if accuracy > best_accuracy:
            best_accuracy = accuracy
            best_model = model
            best_model_name = name

    print(f"\nBest Model: {best_model_name} with {best_accuracy * 100:.2f}% accuracy")

    # Save the best model and features
    os.makedirs('models', exist_ok=True)
    with open('models/disease_predictor.pkl', 'wb') as f:
        pickle.dump(best_model, f)
    
    with open('models/features.pkl', 'wb') as f:
        pickle.dump(list(X.columns), f)
        
    print("Model saved to models/disease_predictor.pkl")

if __name__ == "__main__":
    train_and_evaluate()
