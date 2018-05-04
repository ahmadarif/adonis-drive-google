# Instructions
Make sure to register the provider inside `start/app.js` file.

```js
const providers = [
  ...
  'adonis-drive-google/providers/DriveProvider'
]
```

Add new configuration inside `disks` module in `config/drive.js`:

```js
gcs: {
  driver: 'gcs',
  keyFilename: Env.get('GCS_KEY_FILE_NAME'), // path to json file
  bucket: Env.get('GCS_BUCKET')
}
```

Add google cloud storage variables in `.env`:
```
GCS_KEY_FILE_NAME=
GCS_BUCKET=
```