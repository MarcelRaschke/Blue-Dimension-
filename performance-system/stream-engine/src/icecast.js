import axios from 'axios';

const icecastHost = process.env.ICECAST_HOST || 'icecast';
const icecastPort = process.env.ICECAST_PORT || '8000';
const icecastAdminPassword = process.env.ICECAST_ADMIN_PASSWORD || 'changeme';
const mountPoint = '/blue-dimension';

const icecastClient = axios.create({
  baseURL: `http://${icecastHost}:${icecastPort}`,
  auth: {
    username: 'admin',
    password: icecastAdminPassword
  },
  timeout: 5000
});

export const icecastConfig = {
  async getStreamStatus() {
    try {
      const response = await icecastClient.get('/admin/listmounts.xml');
      const xml = response.data;

      const mountMatch = xml.match(/<mount>([\s\S]*?)<\/mount>/);
      if (!mountMatch) {
        return {
          active: false,
          listeners: 0,
          bitrate: 0,
          uptime: 0
        };
      }

      const mountXml = mountMatch[1];
      const listenersMatch = mountXml.match(/<listeners>(\d+)<\/listeners>/);
      const bitrateMatch = mountXml.match(/<bitrate>(\d+)<\/bitrate>/);

      return {
        active: true,
        listeners: parseInt(listenersMatch?.[1] || '0'),
        bitrate: parseInt(bitrateMatch?.[1] || '0'),
        mountPoint,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get Icecast status:', error.message);
      return {
        active: false,
        listeners: 0,
        bitrate: 0,
        error: error.message
      };
    }
  },

  async updateMetadata({ track = '', artist = '' }) {
    try {
      const params = new URLSearchParams();
      if (track) params.append('title', track);
      if (artist) params.append('artist', artist);
      params.append('song', `${artist} - ${track}`);

      await icecastClient.get(`/admin/metadata.xml?mount=${mountPoint}&${params.toString()}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to update Icecast metadata:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getListenerStats() {
    try {
      const response = await icecastClient.get(`/admin/stats.xml`);
      return response.data;
    } catch (error) {
      console.error('Failed to get listener stats:', error.message);
      return null;
    }
  }
};
