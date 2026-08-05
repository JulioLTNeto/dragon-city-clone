const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/market/buy
// @desc    Buy items from the market
// @access  Private
router.post('/buy', protect, async (req, res) => {
  try {
    const { itemId, x, y, habitatId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Configuração dos itens do mercado
    const marketItems = {
      'fire_habitat': {
        cost: 100,
        type: 'habitat',
        name: 'Habitat de Fogo'
      },
      'fire_dragon_egg': {
        cost: 500,
        type: 'dragon',
        name: 'Ovo de Dragão de Fogo'
      }
    };

    const item = marketItems[itemId];

    if (!item) {
      return res.status(400).json({ message: 'Item inválido' });
    }

    // Verifica se tem ouro suficiente
    if (user.gold < item.cost) {
      return res.status(400).json({ message: 'Ouro insuficiente' });
    }

    // Lógica de compra
    if (item.type === 'habitat') {
      // Verifica colisão espacial se x e y foram enviados
      if (x !== undefined && y !== undefined) {
        const distToCenter = Math.hypot(x, y);
        if (distToCenter > 180) {
          return res.status(400).json({ message: 'Local inválido: Fora da ilha.' });
        }
        for (const placed of user.placedItems) {
          const distToPlaced = Math.hypot(x - placed.x, y - placed.y);
          if (distToPlaced < 80) {
            return res.status(400).json({ message: 'Local inválido: Muito perto de outra construção.' });
          }
        }
      }
      user.gold -= item.cost;
      user.habitats += 1;
      user.placedItems.push({ itemType: itemId, x, y, dragons: [] });
    } else if (item.type === 'dragon') {
      if (!habitatId) return res.status(400).json({ message: 'Selecione um habitat para o dragão' });
      
      const habitat = user.placedItems.id(habitatId);
      if (!habitat || habitat.itemType !== 'fire_habitat') {
        return res.status(400).json({ message: 'Habitat inválido' });
      }
      const level = habitat.level || 1;
      let maxDragons = 3;
      if (level === 2) maxDragons = 6;
      else if (level === 3) maxDragons = 10;
      else if (level === 4) maxDragons = 15;
      else if (level === 5) maxDragons = 20;

      if (habitat.dragons && habitat.dragons.length >= maxDragons) {
        return res.status(400).json({ message: `Habitat cheio (máx: ${maxDragons} dragões)` });
      }

      user.gold -= item.cost;
      user.dragons += 1;
      
      if (!habitat.dragons) habitat.dragons = [];
      habitat.dragons.push('fire_dragon');
    }

    const updatedUser = await user.save();

    res.json({
      message: `Você comprou um ${item.name} com sucesso!`,
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
    console.error('Market purchase error:', error);
    res.status(500).json({ message: 'Erro no servidor ao processar a compra' });
  }
});

// @route   PUT /api/market/move
// @desc    Move an existing item on the island
// @access  Private
router.put('/move', protect, async (req, res) => {
  try {
    const { itemId, x, y } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    if (x === undefined || y === undefined) return res.status(400).json({ message: 'Coordenadas inválidas' });

    // Encontra o item
    const item = user.placedItems.id(itemId);
    if (!item) return res.status(404).json({ message: 'Construção não encontrada' });

    // Verifica limites da ilha
    if (Math.hypot(x, y) > 180) {
      return res.status(400).json({ message: 'Local inválido: Fora da ilha.' });
    }

    // Verifica colisão (ignorando ele mesmo)
    for (const placed of user.placedItems) {
      if (placed._id.toString() === itemId.toString()) continue;
      
      const distToPlaced = Math.hypot(x - placed.x, y - placed.y);
      if (distToPlaced < 80) {
        return res.status(400).json({ message: 'Local inválido: Muito perto de outra construção.' });
      }
    }

    // Atualiza as coordenadas
    item.x = x;
    item.y = y;
    
    const updatedUser = await user.save();

    res.json({
      message: 'Construção movida com sucesso!',
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
    console.error('Move item error:', error);
    res.status(500).json({ message: 'Erro no servidor ao mover a construção' });
  }
});

// @route   POST /api/market/upgrade
// @desc    Upgrade a habitat
// @access  Private
router.post('/upgrade', protect, async (req, res) => {
  try {
    const { habitatId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

    const habitat = user.placedItems.id(habitatId);
    if (!habitat) return res.status(404).json({ message: 'Habitat não encontrado' });

    const currentLevel = habitat.level || 1;
    if (currentLevel >= 5) {
      return res.status(400).json({ message: 'Habitat já está no nível máximo' });
    }

    const upgradeCosts = {
      2: 1000,
      3: 10000,
      4: 50000,
      5: 100000
    };

    const cost = upgradeCosts[currentLevel + 1];

    if (user.gold < cost) {
      return res.status(400).json({ message: 'Ouro insuficiente' });
    }

    user.gold -= cost;
    habitat.level = currentLevel + 1;

    const updatedUser = await user.save();

    res.json({
      message: `Habitat evoluído para o Nível ${habitat.level}!`,
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
    console.error('Upgrade error:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;
