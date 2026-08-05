const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/market/buy
// @desc    Buy items from the market
// @access  Private
router.post('/buy', protect, async (req, res) => {
  try {
    const { itemId, x, y } = req.body;
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

    // Deduz o custo
    user.gold -= item.cost;

    // Adiciona o item
    if (item.type === 'habitat') {
      user.habitats += 1;
      if (x !== undefined && y !== undefined) {
        user.placedItems.push({ itemType: itemId, x, y });
      }
    } else if (item.type === 'dragon') {
      user.dragons += 1;
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

module.exports = router;
