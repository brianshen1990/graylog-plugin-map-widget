import Reflux from 'reflux';

import URLUtils from 'util/URLUtils';
import fetch from 'logic/rest/FetchProvider';
import UserNotification from 'util/UserNotification';

export const MapsActions = Reflux.createActions({
  'get': {asyncResult: true},
  'getMapData': {asyncResult: true},
});

export const MapsStore = Reflux.createStore({
  listenables: [MapsActions],
  mapCoordinates: undefined,

  getInitialState() {
    return {mapCoordinates: this.mapCoordinates};
  },

  getMapData(query, field, rangeType, rangeParams, streamId) {
    // TODO: For relative searches, the param is "range" and not "relative"...
    const timerange = rangeType === 'relative' ? {range: rangeParams.relative} : rangeParams;
    // Make sure the query param is not empty!
    const q = !query || query.length < 1 ? '*' : query;

    // The TimeRange object needs a type to correctly deserialize on the server.
    timerange.type = rangeType;

    const promise = fetch('POST', URLUtils.qualifyUrl('/plugins/org.graylog.plugins.map/mapdata'), {
      query: q,
      timerange: timerange,
      limit: 50,
      stream_id: streamId,
      fields: [field],
    });

    promise.then(
      response => {
        this.trigger({mapCoordinates: response.fields[field]});
      },
      error => {
        let errorMessage;
        if (error.additional && error.additional.status === 400) {
          errorMessage = '地图插件只可以应用在包含地理信息的字段上.';
        } else {
          errorMessage = `导入地图信息失败: ${error.message}`;
        }

        UserNotification.error(errorMessage, '无法导入地图信息');
      }
    );

    MapsActions.getMapData.promise(promise);
  },
});
