import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import {
  getStations,
  getStationById,
  addStation,
  updateStation,
  addSong,
  likeSong,
  removeSong,
  removeStation,
  addStationMsg,
  removeStationMsg,
  unlikeSong,
  generateStation,
} from './station.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getStations)
router.get('/:id', log, getStationById)
router.get('/generate/:prompt', log, generateStation)

router.post('/', log, requireAuth, addStation)
router.post('/:stationId/:songId/like', log, requireAuth, likeSong)
router.post('/:stationId/:songId/unlike', log, requireAuth, unlikeSong)
router.put('/:id', requireAuth, updateStation)
router.post('/:id/song', requireAuth, addSong) // :id is station id
router.delete('/:id', requireAuth, removeStation)
router.delete('/:id/:songId', requireAuth, removeSong)
// router.delete('/:id', requireAuth, requireAdmin, removeStation)

router.post('/:id/msg', requireAuth, addStationMsg)
router.delete('/:id/msg/:msgId', requireAuth, removeStationMsg)

export const stationRoutes = router
