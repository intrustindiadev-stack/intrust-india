process.env.OMNIFLOW_BASE_URL = 'https://mock-whatsapp.ominiflow.com';
process.env.OMNIFLOW_API_TOKEN = 'mock-api-token';

const { 
  sendWhatsAppMessage, 
  sendTemplateMessage, 
  sendMessageToAgent, 
  OmniflowError 
} = require('../lib/omniflow.js');

describe('Omniflow Client Hardening', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function mockResponse(status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
      json: jest.fn().mockResolvedValue(body),
    });
  }

  describe('sendWhatsAppMessage', () => {
    it('should throw OmniflowError when 200 response has success: false', async () => {
      const mockBody = { success: false };
      mockResponse(200, mockBody);

      await expect(sendWhatsAppMessage('9999999999', 'Hello')).rejects.toThrow(OmniflowError);
      try {
        await sendWhatsAppMessage('9999999999', 'Hello');
      } catch (err) {
        expect(err.message).toContain('success is false');
        expect(err.code).toBeUndefined();
        expect(err.rawSnippet).toBe(JSON.stringify(mockBody));
      }
    });

    it('should throw OmniflowError when 200 response has error string', async () => {
      const mockBody = { success: true, error: 'WABA quota exceeded' };
      mockResponse(200, mockBody);

      try {
        await sendWhatsAppMessage('9999999999', 'Hello');
        fail('Should have thrown OmniflowError');
      } catch (err) {
        expect(err).toBeInstanceOf(OmniflowError);
        expect(err.message).toBe('WABA quota exceeded');
        expect(err.code).toBeUndefined();
      }
    });

    it('should throw OmniflowError when 200 response has error object with code', async () => {
      const mockBody = {
        success: true,
        error: { message: 'Cloud API error', code: 131049 }
      };
      mockResponse(200, mockBody);

      try {
        await sendWhatsAppMessage('9999999999', 'Hello');
        fail('Should have thrown OmniflowError');
      } catch (err) {
        expect(err).toBeInstanceOf(OmniflowError);
        expect(err.message).toBe('Cloud API error');
        expect(err.code).toBe(131049);
      }
    });

    it('should throw OmniflowError when 200 response status is failed/error', async () => {
      mockResponse(200, { status: 'failed', id: '123' });
      await expect(sendWhatsAppMessage('9999999999', 'Hello')).rejects.toThrow(OmniflowError);

      mockResponse(200, { status: 'error', id: '123' });
      await expect(sendWhatsAppMessage('9999999999', 'Hello')).rejects.toThrow(OmniflowError);
    });

    it('should throw OmniflowError when 200 response has no success identifier', async () => {
      const mockBody = { success: true };
      mockResponse(200, mockBody);

      try {
        await sendWhatsAppMessage('9999999999', 'Hello');
        fail('Should have thrown OmniflowError');
      } catch (err) {
        expect(err).toBeInstanceOf(OmniflowError);
        expect(err.message).toContain('Missing success identifier');
      }
    });

    it('should return success and messageId on success with id', async () => {
      mockResponse(200, { success: true, id: 'wamid.success1' });
      const res = await sendWhatsAppMessage('9999999999', 'Hello');
      expect(res).toEqual({
        success: true,
        messageId: 'wamid.success1',
        raw: { success: true, id: 'wamid.success1' }
      });
    });

    it('should return success and messageId on success with message_id', async () => {
      mockResponse(200, { success: true, message_id: 'wamid.success2' });
      const res = await sendWhatsAppMessage('9999999999', 'Hello');
      expect(res).toEqual({
        success: true,
        messageId: 'wamid.success2',
        raw: { success: true, message_id: 'wamid.success2' }
      });
    });

    it('should return success and messageId on success with messages array', async () => {
      const body = { success: true, messages: [{ id: 'wamid.success3' }] };
      mockResponse(200, body);
      const res = await sendWhatsAppMessage('9999999999', 'Hello');
      expect(res).toEqual({
        success: true,
        messageId: 'wamid.success3',
        raw: body
      });
    });

    it('should preserve original non-200 throw behavior', async () => {
      mockResponse(500, 'Internal Server Error');
      await expect(sendWhatsAppMessage('9999999999', 'Hello')).rejects.toThrow(Error);
      await expect(sendWhatsAppMessage('9999999999', 'Hello')).rejects.not.toThrow(OmniflowError);
    });
  });

  describe('sendTemplateMessage', () => {
    it('should throw on error body', async () => {
      mockResponse(200, { success: false, error: 'Invalid template components' });
      await expect(sendTemplateMessage('9999999999', 'tpl', 'en', [])).rejects.toThrow(OmniflowError);
    });

    it('should return success, messageId, and raw on success', async () => {
      const body = { success: true, id: 'wamid.tpl' };
      mockResponse(200, body);
      const res = await sendTemplateMessage('9999999999', 'tpl', 'en', []);
      expect(res).toEqual({
        success: true,
        messageId: 'wamid.tpl',
        raw: body
      });
    });
  });

  describe('sendMessageToAgent', () => {
    it('should throw on failure response', async () => {
      mockResponse(200, { success: false, error: 'Agent session expired' });
      await expect(sendMessageToAgent('9999999999', 'ctx', 'hi')).rejects.toThrow(OmniflowError);
    });

    it('should return String wrapper with raw property on success', async () => {
      const body = { success: true, reply: 'Hello from AI Agent' };
      mockResponse(200, body);
      const res = await sendMessageToAgent('9999999999', 'ctx', 'hi');
      
      expect(res).toBeInstanceOf(String);
      expect(res.toString()).toBe('Hello from AI Agent');
      expect(res.raw).toEqual(body);
    });
  });
});
