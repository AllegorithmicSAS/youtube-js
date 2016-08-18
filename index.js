'use strict'

let _ = require('lodash')
let request = require('superagent')
let url = require('url')

// urls can be a single string or an array of string for parallel fetch
function * getVideoInfo (urls, opts) {
  opts = _.defaults(opts, {
    apiKey: process.env.YOUTUBE_API_KEY
  })

  if (!opts.apiKey) throw Error('no google api key provided')

  urls = _.flatten([urls])

  // Try to get the video id : maybe an url, so we try it. If it fails, we
  // assume this is already an id.
  const ids = _.map(urls, u => url.parse(u, true).query.v || u)

  const idParam = _(ids).compact().union().join(',')
  let res = yield request.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&key=${opts.apiKey}&id=${idParam}`)
  let videoResources = _.get(res.body, 'items', [])
  let videoInfos = _.reduce(videoResources, (dict, videoResource) => {
    dict[videoResource.id] = _.assign({}, videoResource.contentDetails, videoResource.snippet)
    return dict
  }, {})

  return ids.map(id => videoInfos[id] || null)
}

// Get basic video info from a video id : useful as it doesn't require an API
// token to access video info
function * getVideoInfoLite (vId) {
  let res = yield request.get(`http://youtube.com/get_video_info?video_id=${vId}`)
  let body = res.body

  if (body.status !== 'ok') throw Error('invalid youtube video id')

  return {
    timestamp: body.timestamp,
    viewCount: body.view_count,
    title: body.title,
    lengthSeconds: body.length_seconds,
    author: body.author,
    keywords: _.split(body.keywords, ',')
  }
}

exports.getVideoUrlFromId = function (id) {
  if (!id) return null
  return `https://www.youtube.com/watch?v=${id}`
}

exports.getVideoIdFromUrl = function (u) {
  return url.parse(u, true).query.v
}

exports.getVideoInfoLite = getVideoInfoLite
exports.getVideoInfo = getVideoInfo
