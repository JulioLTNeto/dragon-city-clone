const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   PUT /api/user/settings
// @desc    Update user settings (name and volume)
// @access  Private
router.put('/settings', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      if (req.body.volume !== undefined) {
        user.volume = req.body.volume;
      }

      const updatedUser = await user.save();

      res.json({
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        volume: updatedUser.volume,
        gold: updatedUser.gold,
        gems: updatedUser.gems,
        dragons: updatedUser.dragons,
        habitats: updatedUser.habitats,
        islands: updatedUser.islands,
        placedItems: updatedUser.placedItems,
        food: updatedUser.food,
        level: updatedUser.level
      });
    } else {
      res.status(404).json({ message: 'Usuário não encontrado' });
    }
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ message: 'Erro no servidor ao atualizar configurações' });
  }
});

// @route   POST /api/user/add-gold
// @desc    Add 100 gold to the user
// @access  Private
router.post('/add-gold', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    
    user.gold += 100;
    const updatedUser = await user.save();
    
    res.json({
      message: '100 Ouro adicionado!',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        volume: updatedUser.volume,
        gold: updatedUser.gold,
        gems: updatedUser.gems,
        dragons: updatedUser.dragons,
        habitats: updatedUser.habitats,
        islands: updatedUser.islands,
        placedItems: updatedUser.placedItems,
        food: updatedUser.food,
        level: updatedUser.level
      }
    });
  } catch (error) {
    console.error('Add gold error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;
