import OpenAI from 'openai'

import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

if (process.env.OPENAI_API_KEY) {
  var client = new OpenAI()
} else {
  console.info('No OPENAI_API_KEY. see README for further instructions')
}

const PAGE_SIZE = 3

export const stationService = {
  remove,
  removeSong,
  query,
  getById,
  add,
  update,
  addSong,
  addStationMsg,
  generateStation,
  removeStationMsg,
  likeSong,
  unlikeSong,
}

const COLLECTION_NAME = 'Stations'

async function query(filterBy = { name: '', tags: [] }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection(COLLECTION_NAME)
    var stationCursor = await collection.find(criteria, { sort })

    // if (filterBy.pageIdx !== undefined) {
    //   stationCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
    // }

    const stations = stationCursor.toArray()
    return stations
  } catch (err) {
    logger.error('cannot find stations', err)
    throw err
  }
}

async function getById(stationId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(stationId) }

    const collection = await dbService.getCollection(COLLECTION_NAME)
    const station = await collection.findOne(criteria)

    station.createdAt = station._id.getTimestamp()
    return station
  } catch (err) {
    logger.error(`while finding station ${stationId}`, err)
    throw err
  }
}

async function remove(stationId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  // const { _id: ownerId, isAdmin } = loggedinUser
  // TODO: check owner

  try {
    const criteria = {
      _id: ObjectId.createFromHexString(stationId),
    }

    const collection = await dbService.getCollection(COLLECTION_NAME)
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw 'Not your station'
    return stationId
  } catch (err) {
    logger.error(`cannot remove station ${stationId}`, err)
    throw err
  }
}

async function removeSong(stationId, songId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  // const { _id: ownerId, isAdmin } = loggedinUser

  // TODO: check if admin \ user's station

  try {
    const criteria = {
      _id: ObjectId.createFromHexString(stationId),
    }

    const collection = await dbService.getCollection(COLLECTION_NAME)
    const res = await collection.updateOne(criteria, {
      $pull: { songs: { yt_id: songId } },
    })

    if (res.deletedCount === 0) throw 'Not your station'
    return stationId
  } catch (err) {
    logger.error(`cannot remove station ${stationId}`, err)
    throw err
  }
}

async function add(station) {
  try {
    const collection = await dbService.getCollection(COLLECTION_NAME)
    await collection.insertOne(station)

    return station
  } catch (err) {
    logger.error('cannot insert station', err)
    throw err
  }
}

async function update(station) {
  const { createdBy } = station
  let stationToSave = {}

  if (station.name) {
    stationToSave.name = station.name
  }
  if (station.description) {
    stationToSave.description = station.description
  }
  if (station.createdBy?.imgUrl) {
    stationToSave = { ...stationToSave, 'createdBy.imgUrl': createdBy.imgUrl }
  }
  if (station.tags) {
    stationToSave.tags = station.tags
  }

  try {
    const criteria = { _id: ObjectId.createFromHexString(station._id) }

    const collection = await dbService.getCollection(COLLECTION_NAME)
    await collection.updateOne(criteria, { $set: stationToSave })

    return station
  } catch (err) {
    logger.error(`cannot update station ${station._id}`, err)
    throw err
  }
}

async function likeSong(stationId, songId, userId) {
  // 2 steps: 1. Update station ; 2. Update user's liked songs
  const song = await _updateStation()
  await _updateUser()
  return song

  async function _updateUser() {
    try {
      const criteria = {
        _id: ObjectId.createFromHexString(userId),
      }
      const collection = await dbService.getCollection('Users')
      const updated = await collection.updateOne(criteria, {
        $addToSet: { 'likedSongsStation.songs': song },
      })
      return updated
    } catch (err) {
      logger.error(`cannot update station ${stationId}`, err)
      throw err
    }
  }

  async function _updateStation() {
    try {
      const criteria = {
        _id: ObjectId.createFromHexString(stationId),
        'songs.yt_id': songId,
      }
      const collection = await dbService.getCollection(COLLECTION_NAME)
      const updated = await collection.updateOne(criteria, {
        $addToSet: { 'songs.$.likedByUsers': userId },
      })

      const result = await collection.findOne(criteria, {
        projection: { songs: { $elemMatch: { yt_id: songId } } },
      })

      return result.songs[0]
    } catch (err) {
      logger.error(`cannot update station ${stationId}`, err)
      throw err
    }
  }
}

async function unlikeSong(stationId, songId, userId) {
  // 2 steps: 1. Update station ; 2. Update user's liked songs
  await _updateStation()
  const result = await _updateUser()
  return result

  async function _updateUser() {
    try {
      const criteria = {
        _id: ObjectId.createFromHexString(userId),
      }
      const collection = await dbService.getCollection('Users')
      const updated = await collection.updateOne(criteria, {
        $pull: { 'likedSongsStation.songs': { yt_id: songId } },
      })
      return updated
    } catch (err) {
      logger.error(`cannot update station ${stationId}`, err)
      throw err
    }
  }

  async function _updateStation() {
    try {
      const criteria = {
        _id: ObjectId.createFromHexString(stationId),
        'songs.yt_id': songId,
      }
      const collection = await dbService.getCollection(COLLECTION_NAME)
      const updated = await collection.updateOne(criteria, {
        $pull: { 'songs.$.likedByUsers': userId },
      })
      return updated
    } catch (err) {
      logger.error(`cannot update station ${stationId}`, err)
      throw err
    }
  }
}

async function addSong(stationId, song) {
  try {
    const criteria = {
      _id: ObjectId.createFromHexString(stationId),
      'songs.yt_id': { $ne: song.yt_id },
    }
    const collection = await dbService.getCollection(COLLECTION_NAME)
    await collection.updateOne(criteria, { $addToSet: { songs: song } })
    return song
  } catch (err) {
    logger.error(`cannot update station ${stationId}`, err)
    throw err
  }
}

async function addStationMsg(stationId, msg) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(stationId) }
    msg.id = makeId()

    const collection = await dbService.getCollection(COLLECTION_NAME)
    await collection.updateOne(criteria, { $push: { msgs: msg } })

    return msg
  } catch (err) {
    logger.error(`cannot add station msg ${stationId}`, err)
    throw err
  }
}

async function generateStation(prompt) {
  try {
    const completion = await client.chat.completions.create({
      model: 'o1-mini',
      messages: [
        {
          role: 'user',
          content: `Generate a ${prompt} playlist with one song per line, no extra text, up to 10 songs.`,
        },
      ],
    })

    return completion.choices[0].message.content
      .split('\n')
      .map((s) => s.trim())
  } catch (err) {
    logger.error('cannot insert station', err)
    throw err
  }
}

async function removeStationMsg(stationId, msgId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(stationId) }

    const collection = await dbService.getCollection(COLLECTION_NAME)
    await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

    return msgId
  } catch (err) {
    logger.error(`cannot add station msg ${stationId}`, err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  const criteria = {}

  if (filterBy.name && filterBy.name.trim()) {
    criteria.name = { $regex: filterBy.name.trim(), $options: 'i' }
  }

  if (filterBy.tags && filterBy.tags.length) {
    criteria.tags = { $in: filterBy.tags }
  }
  return criteria
}

function _buildSort(filterBy) {
  if (!filterBy.sortField) return {}
  return { [filterBy.sortField]: filterBy.sortDir }
}
