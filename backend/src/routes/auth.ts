import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../firebase';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

import jwt from 'jsonwebtoken';

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user exists
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    if (!snapshot.empty) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user in Firestore
    const newUserRef = await usersRef.add({
      email,
      name,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    const user = {
      id: newUserRef.id,
      name,
      email,
    };
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    if (snapshot.empty) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    
    const isValid = await bcrypt.compare(password, userData.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const user = {
      id: userDoc.id,
      name: userData.name,
      email: userData.email,
    };
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
