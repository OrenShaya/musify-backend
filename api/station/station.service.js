import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

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
  removeStationMsg,
}

const COLLECTION_NAME = 'Stations'

async function query(filterBy = { name: '', tags: [] }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection(COLLECTION_NAME)
    var stationCursor = await collection.find(criteria, { sort })

    if (filterBy.pageIdx !== undefined) {
      stationCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
    }

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

async function addSong(stationId, song) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(stationId) }
    const collection = await dbService.getCollection(COLLECTION_NAME)
    return await collection.updateOne(criteria, { $push: { songs: song } })
  } catch (err) {
    logger.error(`cannot update station ${station._id}`, err)
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
  const criteria = {
    name: { $regex: filterBy.name, $options: 'i' },
  }

  if (filterBy.tags && filterBy.tags.length) {
    criteria.tags = { $in: filterBy.tags }
  }

  // TODO: add for likedByUsers, songs

  return criteria
}

function _buildSort(filterBy) {
  if (!filterBy.sortField) return {}
  return { [filterBy.sortField]: filterBy.sortDir }
}
