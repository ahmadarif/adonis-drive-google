'use strict'

const Storage = require('@google-cloud/storage')
const Resetable = require('resetable')
const mime = require('mime-types')
const fs = require('fs')

/**
 * Google cloud storage driver for flydrive
 *
 * @class GoogleStorage
 */
class GoogleStorage {
  constructor (config) {
    this.storage = new Storage({
      keyFilename: config.keyFilename
    })

    this._bucket = new Resetable(config.bucket)
  }

  /**
   * Use a different bucket at runtime.
   *
   * @method bucket
   *
   * @param  {String} bucket
   *
   * @chainable
   */
  bucket (bucket) {
    this._bucket.set(bucket)
    return this
  }

  /**
   * Finds if a file exists or not
   *
   * @method exists
   * @async
   *
   * @param  {String} location
   *
   * @return {Promise<Boolean>}
   */
  exists (location) {
    return new Promise((resolve, reject) => {
      this.storage.bucket(this._bucket.pull()).file(location).exists({}, (error, exists) => {
        if (error) return reject(error)
        return resolve(exists)
      })
    })
  }

  /**
   * Returns url for a given key. Note this method doesn't
   * validates the existence of file or it's visibility
   * status.
   * 
   * @method getUrl
   *
   * @param {string} location
   * @param {string} bucket
   *
   * @returns {string} File URL
   */
  getUrl (location, bucket) {
    bucket = bucket || this._bucket.pull()
    return `https://storage.googleapis.com/${bucket}/${location}`
  }

  /**
   * Returns signed url for an existing file
   *
   * @method getSignedUrl
   * @async
   *
   * @param  {String}     location
   * @param  {String}     [expiry = '12-30-2030'] (MM-DD-YY)
   *
   * @return {String}
   */
  getSignedUrl (location, expiry) {
    const options = { action: 'read', expires: expiry }

    return new Promise((resolve, reject) => {
      this.storage.bucket(this._bucket.pull()).file(location).getSignedUrl(options, (error, signedUrl) => {
        if (error) return reject(error)
        return resolve(signedUrl)
      })
    })
  }

  /**
   * Create a new file from string or buffer
   *
   * @method put
   * @async
   *
   * @param  {String} location
   * @param  {String} content
   * @param  {Object} [options] example = { public: true }
   *
   * @return {Promise<String>} Public URL
   */
  put (location, content, options = {}) {
    const clonedOptions = Object.assign({}, options, {
      destination: location,
      contentType: mime.lookup(location)
    })

    return new Promise((resolve, reject) => {
      this.storage.bucket(this._bucket.pull()).upload(content, clonedOptions, (error) => {
        if (error) return reject(error)
        return resolve(this.getUrl(location, this._bucket.pull()))
      })
    })
  }

  /**
   * Remove a file
   *
   * @method delete
   * @async
   *
   * @param  {String} location
   *
   * @return {Promise<Boolean>}
   */
  delete (location) {
    return new Promise((resolve, reject) => {
      this.storage.bucket(this._bucket.pull()).file(location).delete({}, (error) => {
        if (error) return reject(error)
        return resolve(true)
      })
    })
  }

  /**
   * Copy file from one location to another within
   * or accross google storage buckets.
   *
   * @method copy
   * @async
   *
   * @param  {String} src
   * @param  {String} dest
   * @param  {String} [destBucket = this.bucket]
   * @param  {Object} [options = {}] { public: true }
   *
   * @return {Promise<String>}
   */
  copy (src, dest, destBucket, options = {}) {
    const bucket = this._bucket.pull()
    destBucket = destBucket || bucket

    return new Promise((resolve, reject) => {
      this.storage.bucket(bucket).file(src)
        .copy(this.storage.bucket(destBucket).file(dest), options, (error) => {
          if (error) return reject(error)

          if (options.public === true) {
            return this.makePublic(dest)
              .then(data => resolve(this.getUrl(dest, destBucket)))
              .catch(err => reject(err))
          } else {
            return resolve(this.getUrl(dest, destBucket))
          }
        })
    })
  }

  /**
   * Moves file from one location to another. This
   * method will call `copy` and `delete` under
   * the hood.
   *
   * @method move
   * @async
   *
   * @param  {String} src
   * @param  {String} dest
   * @param  {String} [destBucket = this.bucket]
   * @param  {Object} [options = {}]
   *
   * @return {Promise<String>}
   */
  move (src, dest, destBucket, options = {}) {
    const bucket = this._bucket.pull()
    destBucket = destBucket || bucket

    return new Promise((resolve, reject) => {
      this.storage.bucket(bucket).file(src)
        .move(this.storage.bucket(destBucket).file(dest), options, (error, result) => {
          if (error) return reject(error)
          
          if (options.public === true) {
            return this.makePublic(dest)
              .then(data => resolve(this.getUrl(dest, destBucket)))
              .catch(err => reject(err))
          } else {
            return resolve(this.getUrl(dest, destBucket))
          }
        })
    })
  }

  /**
   * Set a file to be publicly readable and maintain all previous 
   * permissions.
   *
   * @method makePublic
   * @async
   *
   * @param  {String} location
   *
   * @return {Promise<Boolean>}
   */
  makePublic (location) {
    return new Promise((resolve, reject) => {
      this.storage.bucket(this._bucket.pull()).file(location)
        .makePublic((error, result) => {
          if (error) return reject(error)
          return resolve(true)
        })
    })
  }

  /**
   * Make a file private to the project and remove all other permissions. 
   * Set options.strict to true to make the file private to only the owner.
   *
   * @method makePrivate
   * @async
   *
   * @param  {String} location
   *
   * @return {Promise<Boolean>}
   */
  makePrivate (location) {
    return new Promise((resolve, reject) => {
      this.storage.bucket(this._bucket.pull()).file(location)
        .makePrivate({}, (error, result) => {
          if (error) return reject(error)
          return resolve(true)
        })
    })
  }

  /**
   * Create a readable stream to read the contents of the remote file. 
   * It can be piped to a writable stream or listened to for 'data' 
   * events to read a file's contents.
   *
   * @method getStream
   *
   * @param  {String} location
   *
   * @return {Stream}
   */
  getStream (location) {
    return this.storage.bucket(this._bucket.pull()).file(location).createReadStream()
  }

  /**
   * Get a file object and its metadata if it exists.
   * 
   * @method getObject
   * @async
   * 
   * @param {String} location
   * 
   * @returns {Promise<Object>}
   */
  getObject (location) {
    return new Promise((resolve, reject) => {
      this.storage.bucket(this._bucket.pull()).file(location)
        .get({}, (error, file, apiResponse) => {
          if (error) return reject(error)
          return resolve(file)
        })
    })
  }

  /**
   * Convenience method to download a file into memory or to a local destination.
   * The file will be saved in the tmp directory.
   * 
   * @method download
   * @async
   * 
   * @param {String} location 
   * 
   * @returns {String} File path
   */
  download (location) {
    const dir = 'tmp'
    const dest = `${dir}/${new Date().getTime()}-${location}`
    
    // create dir if doesn't exists
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)

    return new Promise((resolve, reject) => {
      this.storage.bucket(this._bucket.pull()).file(location)
        .download({ destination: dest }, (error) => {
          if (error) return reject(error)
          return resolve(dest)
        })
    })
  }
}

module.exports = GoogleStorage
