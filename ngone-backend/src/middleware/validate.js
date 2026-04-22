import { AppError, ErrorCodes } from '../utils/apiResponse.js';

/**
 * Zod request validation middleware
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {string} [source='body'] - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      return next(
        new AppError(422, 'Validation failed', ErrorCodes.VALIDATION_ERROR, errors)
      );
    }

    // Replace request data with parsed (coerced/transformed) values
    req[source] = result.data;
    next();
  };
}

/**
 * Validate multiple sources at once
 * @param {object} schemas - { body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }
 * @returns {Function}
 */
export function validateAll(schemas) {
  return (req, res, next) => {
    const allErrors = [];

    for (const [source, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: `${source}.${issue.path.join('.')}`,
          message: issue.message,
          code: issue.code,
        }));
        allErrors.push(...errors);
      } else {
        req[source] = result.data;
      }
    }

    if (allErrors.length > 0) {
      return next(
        new AppError(422, 'Validation failed', ErrorCodes.VALIDATION_ERROR, allErrors)
      );
    }

    next();
  };
}

export default { validate, validateAll };
