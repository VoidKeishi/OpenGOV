import type { LlmToolDef } from '../openrouter/types';

export const PORTAL_URL = 'https://dichvucong.gov.vn';

/**
 * Fail-closed system prompt (ARCHITECTURE.md §4, principle 5). The model answers only
 * from tool results, cites legal codes + source URLs (preferring legal_fragments), and
 * never writes fees/deadlines/dates as prose — those come from cards.
 */
export const SYSTEM_PROMPT = `Bạn là trợ lý thủ tục hành chính công của Việt Nam (OpenGOV). Trả lời bằng tiếng Việt, ngắn gọn, chính xác.

QUY TẮC BẮT BUỘC:
1. CHỈ trả lời dựa trên kết quả từ các công cụ (tool). Tuyệt đối không bịa. Nếu chưa có dữ liệu, hãy gọi công cụ trước khi trả lời.
2. Quy trình: dùng search_procedures để tìm đúng thủ tục → get_procedure để nạp toàn bộ hồ sơ → rồi mới trả lời. Với câu hỏi về hồ sơ/điều kiện/biểu mẫu, có thể gọi get_form_schema.
3. Khi biết thông tin cá nhân của người dùng ảnh hưởng đến hồ sơ (hình thức nộp, trường hợp, đã có tài khoản định danh...), gọi update_case_facts để ghi nhớ.
4. TRÍCH DẪN: mọi câu trả lời phải dẫn nguồn — ưu tiên trích các đoạn trong "legal_fragments" của bản ghi (mỗi đoạn có mã văn bản, điều khoản và source_url). Nếu không có fragment phù hợp, dẫn mã văn bản trong "legal_basis" và source url của thủ tục.
5. KHÔNG viết con số vào lời văn. Phí, lệ phí, thời hạn, thời gian xử lý, cơ quan thực hiện, ngày cập nhật... được hiển thị riêng qua thẻ (card) đọc thẳng từ dữ liệu. Trong lời văn hãy nói định tính ("nộp trực tuyến rẻ hơn", "có thời hạn theo quy định") và để người dùng xem số liệu ở thẻ. Không tự ý nêu con số mà dữ liệu công cụ không có.
6. FAIL-CLOSED: nếu câu hỏi nằm ngoài phạm vi dữ liệu (không tìm thấy thủ tục phù hợp trong tool), hãy nói rõ "Xin lỗi, thông tin này hiện không có trong dữ liệu" và mời người dùng tra cứu tại Cổng Dịch vụ công quốc gia ${PORTAL_URL}. Không đoán.

Phạm vi dữ liệu đầy đủ hiện có 3 thủ tục pilot: đăng ký thường trú (1.004222), đăng ký thành lập doanh nghiệp tư nhân (2.001610), đăng ký nội quy lao động (2.001955). Các thủ tục khác chỉ có metadata cơ bản.`;

export const TOOL_DEFS: LlmToolDef[] = [
  {
    name: 'search_procedures',
    description:
      'Tìm thủ tục hành chính theo cụm từ tự nhiên của người dân (vd "nhập hộ khẩu", "mở công ty tư nhân"). Trả về danh sách ứng viên {code, name}.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Cụm từ tìm kiếm tiếng Việt' } },
      required: ['query'],
    },
  },
  {
    name: 'get_procedure',
    description: 'Nạp toàn bộ bản ghi đã chuẩn hóa của một thủ tục theo mã (gồm hồ sơ, phí, thời hạn, căn cứ pháp lý, legal_fragments).',
    parameters: {
      type: 'object',
      properties: { code: { type: 'string', description: 'Mã thủ tục, vd 1.004222' } },
      required: ['code'],
    },
  },
  {
    name: 'get_form_schema',
    description: 'Lấy schema xác thực biểu mẫu của thủ tục (nếu có) để hướng dẫn điền hồ sơ.',
    parameters: {
      type: 'object',
      properties: { code: { type: 'string' } },
      required: ['code'],
    },
  },
  {
    name: 'update_case_facts',
    description:
      'Ghi nhớ thông tin tình huống của người dùng (case_facts) để cá nhân hóa checklist và điều kiện, vd {"kenh_nop":"truc_tuyen","truong_hop":"thue_muon_o_nho"}.',
    parameters: {
      type: 'object',
      properties: { facts: { type: 'object', description: 'Các cặp khóa-giá trị case_facts cần cập nhật' } },
      required: ['facts'],
    },
  },
];
