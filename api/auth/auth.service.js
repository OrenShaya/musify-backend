import Cryptr from 'cryptr'
import bcrypt from 'bcrypt'

import { userService } from '../user/user.service.js'
import { logger } from '../../services/logger.service.js'

const cryptr = new Cryptr(process.env.SECRET || 'Secret-Puk-1234')

export const authService = {
  signup,
  login,
  getLoginToken,
  validateToken,
}

async function login(username, password) {
  logger.debug(`auth.service - login with username: ${username}`)

  const user = await userService.getByUsername(username)
  if (!user) return Promise.reject('Invalid username or password')

  const match = await bcrypt.compare(password, user.password)
  if (!match) return Promise.reject('Invalid username or password')

  delete user.password
  user._id = user._id.toString()
  return user
}

async function signup({ username, password, email, imgUrl, isAdmin }) {
  const saltRounds = 10

  logger.debug(
    `auth.service - signup with username: ${username}, email: ${email}`
  )
  if (!username || !password || !email)
    return Promise.reject('Missing required signup information')

  const userExist = await userService.getByUsername(username)
  if (userExist) return Promise.reject('Username already taken')

  const hash = await bcrypt.hash(password, saltRounds)
  return userService.add({
    username,
    password: hash,
    email,
    imgUrl,
    isAdmin,
    likedSongsStation: {
      songs: [],
      createdBy: {
        imgUrl:
          'https://res.cloudinary.com/dsw8rfwb7/image/upload/v1740086846/ohum8u1qpefvb0lmwgkt.jpg',
      },
      name: 'Liked Songs',
      yt_id: 'THE-CAKE-IS-A-LIE',
    },
  })
}

function getLoginToken(user) {
  const userInfo = {
    _id: user._id,
    fullname: user.fullname,
    isAdmin: user.isAdmin,
  }
  return cryptr.encrypt(JSON.stringify(userInfo))
}

function validateToken(loginToken) {
  try {
    const json = cryptr.decrypt(loginToken)
    const loggedinUser = JSON.parse(json)
    return loggedinUser
  } catch (err) {
    console.log('Invalid login token')
  }
  return null
}
