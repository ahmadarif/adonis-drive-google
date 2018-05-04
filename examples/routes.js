'use strict'

const Route = use('Route')
const Drive = use('Drive')

Route.post('gcs', async ({ request, response }) => {
  const file = request.file('image')
  const url = await Drive.disk('gcs').put(file.clientName, file.tmpPath)
  response.send({ url: url })

  // if the file is publicly accessible, add options { public: true }
  // const url = await Drive.disk('gcs').put(file.clientName, file.tmpPath, { public: true })
})

Route.get('gcs/:filename/exists', async ({ params, response }) => {
  const filename = params.filename
  const exists = await Drive.disk('gcs').exists(filename)
  response.send({ exists: exists })
})

Route.get('gcs/:filename/url', async ({ params, response }) => {
  const filename = params.filename
  const url = await Drive.disk('gcs').getUrl(filename)
  response.send({ url: url })
})

Route.get('gcs/:filename/signUrl', async ({ params, response }) => {
  const filename = params.filename
  const signedUrl = await Drive.disk('gcs').getSignedUrl(filename, '05-05-2018')
  response.send({ signedUrl: signedUrl })
})

Route.get('gcs/:filename/object', async ({ params, response }) => {
  const filename = params.filename
  const object = await Drive.disk('gcs').getObject(filename)
  response.send(object)
})

Route.get('gcs/:filename/download', async ({ params, response }) => {
  const filename = params.filename
  const path = await Drive.disk('gcs').download(filename)
  response.send({ path: path })
})

Route.delete('gcs/:filename', async ({ params, response }) => {
  const filename = params.filename
  const isDeleted = await Drive.disk('gcs').delete(filename)
  response.send({ isDeleted: isDeleted })
})

Route.put('gcs/:filename/copy', async ({ params, request, response }) => {
  const filename = params.filename
  const dest = request.input('dest')
  const isCopied = await Drive.disk('gcs').copy(filename, dest)
  response.send({ isCopied: isCopied })

  // if the file is publicly accessible, add options { public: true }
  // const isCopied = await Drive.disk('gcs').copy(filename, dest, { public: true })
})

Route.put('gcs/:filename/move', async ({ params, request, response }) => {
  const filename = params.filename
  const dest = request.input('dest')
  const destbucket = request.input('destbucket')
  const isMoved = await Drive.disk('gcs').move(filename, dest, destbucket)
  response.send({ isMoved: isMoved })

  // if the file is publicly accessible, add options { public: true }
  // const isMoved = await Drive.disk('gcs').move(filename, destname, destbucket, { public: true })
})
