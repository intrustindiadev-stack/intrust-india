import { 
  sendWhatsAppWelcomeOnLink, 
  sendWhatsAppLoginAlert 
} from '../lib/notifications/authWhatsapp'
import { createAdminClient } from '@/lib/supabaseServer'
import { 
  sendTemplateMessage, 
  OmniflowError,
  WELCOME_TEMPLATE,
  MERCHANT_WELCOME_LINKED_TEMPLATE,
  LOGIN_ALERT_TEMPLATE
} from '@/lib/omniflow'
import crypto from 'crypto'

jest.mock('@/lib/supabaseServer', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/omniflow', () => {
  const original = jest.requireActual('@/lib/omniflow')
  return {
    ...original,
    sendTemplateMessage: jest.fn(),
  }
})

describe('Auth WhatsApp Notifications Helper', () => {
  let mockSupabase
  let mockInsert
  let mockFrom
  let mockSelect
  let mockEq
  let mockGte
  let mockLimit
  let mockMaybeSingle
  let mockLogsData

  beforeEach(() => {
    jest.clearAllMocks()

    mockLogsData = []

    mockInsert = jest.fn().mockImplementation(async (row) => {
      const rows = Array.isArray(row) ? row : [row]
      rows.forEach(r => {
        mockLogsData.push({
          ...r,
          created_at: r.created_at || new Date().toISOString()
        })
      })
      return { data: null, error: null }
    })

    const chain = {}
    mockSelect = jest.fn().mockReturnValue(chain)
    mockEq = jest.fn().mockReturnValue(chain)
    mockGte = jest.fn().mockReturnValue(chain)
    mockLimit = jest.fn().mockReturnValue(chain)

    mockMaybeSingle = jest.fn().mockImplementation(async () => {
      let filtered = [...mockLogsData]

      // Filter by eq
      mockEq.mock.calls.forEach(([col, val]) => {
        filtered = filtered.filter(item => item[col] === val)
      })

      // Filter by gte
      mockGte.mock.calls.forEach(([col, val]) => {
        filtered = filtered.filter(item => {
          if (!item[col]) return false
          return new Date(item[col]) >= new Date(val)
        })
      })

      if (filtered.length > 0) {
        return { data: filtered[0], error: null }
      }
      return { data: null, error: null }
    })

    chain.select = mockSelect
    chain.eq = mockEq
    chain.gte = mockGte
    chain.limit = mockLimit
    chain.maybeSingle = mockMaybeSingle
    chain.single = mockMaybeSingle
    chain.insert = mockInsert

    mockFrom = jest.fn().mockReturnValue(chain)
    mockSupabase = {
      from: mockFrom,
    }

    createAdminClient.mockReturnValue(mockSupabase)

    // Default successful resolve for sendTemplateMessage
    sendTemplateMessage.mockResolvedValue({
      success: true,
      messageId: 'mock-wamid-auth-123',
      raw: { success: true, id: 'mock-wamid-auth-123' }
    })
  })

  describe('sendWhatsAppWelcomeOnLink', () => {
    const defaultArgs = {
      userId: 'user-c1',
      audience: 'customer',
      phone: '+919999988888'
    }

    it('should choose WELCOME_TEMPLATE for customer audience and log success', async () => {
      await sendWhatsAppWelcomeOnLink(defaultArgs)

      // Verify correct template name was sent
      expect(sendTemplateMessage).toHaveBeenCalledWith(
        defaultArgs.phone,
        WELCOME_TEMPLATE.name,
        WELCOME_TEMPLATE.language,
        []
      )

      // Verify the log entry written to supabase
      expect(mockInsert).toHaveBeenCalled()
      const logRow = mockInsert.mock.calls[0][0]
      expect(logRow.user_id).toBe(defaultArgs.userId)
      expect(logRow.audience).toBe('customer')
      expect(logRow.status).toBe('sent')
      expect(logRow.wamid).toBe('mock-wamid-auth-123')
      expect(logRow.content_preview).toBe('[template:intrust_welcome_linked]')
      
      const expectedHash = crypto.createHash('sha256').update('+919999988888').digest('hex')
      expect(logRow.phone_hash).toBe(expectedHash)
    })

    it('should choose MERCHANT_WELCOME_LINKED_TEMPLATE for merchant audience and log success', async () => {
      const merchantArgs = {
        userId: 'user-m1',
        audience: 'merchant',
        phone: '+919999977777'
      }

      await sendWhatsAppWelcomeOnLink(merchantArgs)

      expect(sendTemplateMessage).toHaveBeenCalledWith(
        merchantArgs.phone,
        MERCHANT_WELCOME_LINKED_TEMPLATE.name,
        MERCHANT_WELCOME_LINKED_TEMPLATE.language,
        []
      )

      expect(mockInsert).toHaveBeenCalled()
      const logRow = mockInsert.mock.calls[0][0]
      expect(logRow.user_id).toBe(merchantArgs.userId)
      expect(logRow.audience).toBe('merchant')
      expect(logRow.status).toBe('sent')
      expect(logRow.content_preview).toBe('[template:intrust_merchant_welcome_linked]')
    })

    it('should skip sending if a welcome log already exists for user and audience', async () => {
      // Seed an existing log row
      mockLogsData.push({
        user_id: 'user-c1',
        audience: 'customer',
        content_preview: '[template:intrust_welcome_linked]',
        status: 'sent'
      })

      await sendWhatsAppWelcomeOnLink(defaultArgs)

      // sendTemplateMessage should NOT have been called
      expect(sendTemplateMessage).not.toHaveBeenCalled()
    })

    it('should log failed status with error_code and error_detail when sendTemplateMessage throws OmniflowError', async () => {
      const omniError = new OmniflowError('WABA Rate Limit Exceeded', 131048, '{"error": "rate"}')
      sendTemplateMessage.mockRejectedValue(omniError)

      await sendWhatsAppWelcomeOnLink(defaultArgs)

      // Verify mockInsert logged the failure
      expect(mockInsert).toHaveBeenCalled()
      const logRow = mockInsert.mock.calls[0][0]
      expect(logRow.status).toBe('failed')
      expect(logRow.error_code).toBe(131048)
      expect(logRow.error_detail).toBe('{"error": "rate"}')
      expect(logRow.content_preview).toBe('[FAILED] [template:intrust_welcome_linked] :: WABA Rate Limit Exceeded')
    })

    it('should log failed status with raw error message when sendTemplateMessage throws normal Error', async () => {
      const stdError = new Error('Network Connection Error')
      sendTemplateMessage.mockRejectedValue(stdError)

      await sendWhatsAppWelcomeOnLink(defaultArgs)

      expect(mockInsert).toHaveBeenCalled()
      const logRow = mockInsert.mock.calls[0][0]
      expect(logRow.status).toBe('failed')
      expect(logRow.error_code).toBeNull()
      expect(logRow.error_detail).toBe('Network Connection Error')
      expect(logRow.content_preview).toBe('[FAILED] [template:intrust_welcome_linked] :: Network Connection Error')
    })

    it('should swallow all outer exceptions and be non-throwing', async () => {
      // Mock createAdminClient to throw an error
      createAdminClient.mockImplementationOnce(() => {
        throw new Error('Database connection crashed')
      })

      // This should run without throwing any error
      await expect(sendWhatsAppWelcomeOnLink(defaultArgs)).resolves.not.toThrow()
    })
  })

  describe('sendWhatsAppLoginAlert', () => {
    const loginArgs = {
      userId: 'user-l1',
      audience: 'customer',
      phone: '+919999988888',
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
    }

    it('should send LOGIN_ALERT_TEMPLATE with properly formatted device info and log success', async () => {
      await sendWhatsAppLoginAlert(loginArgs)

      expect(sendTemplateMessage).toHaveBeenCalled()
      
      const [calledPhone, calledTemplateName, calledLang, calledComponents] = sendTemplateMessage.mock.calls[0]
      expect(calledPhone).toBe(loginArgs.phone)
      expect(calledTemplateName).toBe(LOGIN_ALERT_TEMPLATE.name)
      expect(calledLang).toBe(LOGIN_ALERT_TEMPLATE.language)

      // Expected displayDeviceInfo: [Customer] Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0
      expect(calledComponents[0].parameters[0].text).toBe('[Customer] Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')
      // Time is formatted as IST
      expect(calledComponents[0].parameters[1].text).toContain('IST')

      // Verify the log entry
      expect(mockInsert).toHaveBeenCalled()
      const logRow = mockInsert.mock.calls[0][0]
      expect(logRow.user_id).toBe(loginArgs.userId)
      expect(logRow.audience).toBe('customer')
      expect(logRow.status).toBe('sent')
      expect(logRow.content_preview).toBe('[template:intrust_login_alert]')
    })

    it('should truncate deviceInfo if it exceeds 80 characters', async () => {
      const longDeviceInfo = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      
      await sendWhatsAppLoginAlert({
        ...loginArgs,
        deviceInfo: longDeviceInfo
      })

      const calledComponents = sendTemplateMessage.mock.calls[0][3]
      const textParam = calledComponents[0].parameters[0].text
      // Should start with prefix, be <= 80 characters + prefix length, and end with '...'
      expect(textParam).toBe('[Customer] ' + longDeviceInfo.slice(0, 77) + '...')
    })

    it('should handle missing deviceInfo gracefully', async () => {
      await sendWhatsAppLoginAlert({
        ...loginArgs,
        deviceInfo: undefined
      })

      const calledComponents = sendTemplateMessage.mock.calls[0][3]
      expect(calledComponents[0].parameters[0].text).toBe('[Customer] Unknown device')
    })

    it('should skip sending if a login alert was sent within the last 5 minutes', async () => {
      // Seed a recent login alert row
      const recentTime = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      mockLogsData.push({
        user_id: 'user-l1',
        content_preview: '[template:intrust_login_alert]',
        created_at: recentTime,
        status: 'sent'
      })

      await sendWhatsAppLoginAlert(loginArgs)

      expect(sendTemplateMessage).not.toHaveBeenCalled()
    })

    it('should NOT skip sending if the last login alert was sent more than 5 minutes ago', async () => {
      // Seed an old login alert row (e.g. 6 minutes ago)
      const oldTime = new Date(Date.now() - 6 * 60 * 1000).toISOString()
      mockLogsData.push({
        user_id: 'user-l1',
        content_preview: '[template:intrust_login_alert]',
        created_at: oldTime,
        status: 'sent'
      })

      await sendWhatsAppLoginAlert(loginArgs)

      expect(sendTemplateMessage).toHaveBeenCalled()
    })

    it('should log failed status with error details when sending login alert fails', async () => {
      const omniError = new OmniflowError('Template mismatch', 131050, '{"error": "template"}')
      sendTemplateMessage.mockRejectedValue(omniError)

      await sendWhatsAppLoginAlert(loginArgs)

      expect(mockInsert).toHaveBeenCalled()
      const logRow = mockInsert.mock.calls[0][0]
      expect(logRow.status).toBe('failed')
      expect(logRow.error_code).toBe(131050)
      expect(logRow.error_detail).toBe('{"error": "template"}')
      expect(logRow.content_preview).toBe('[FAILED] [template:intrust_login_alert] :: Template mismatch')
    })

    it('should swallow all outer exceptions and be non-throwing', async () => {
      createAdminClient.mockImplementationOnce(() => {
        throw new Error('Database down')
      })

      await expect(sendWhatsAppLoginAlert(loginArgs)).resolves.not.toThrow()
    })
  })
})
