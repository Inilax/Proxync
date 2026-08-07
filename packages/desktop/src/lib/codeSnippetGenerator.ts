export type FrameworkLanguage = 'nestjs' | 'express' | 'fastapi' | 'springboot' | 'go';

export function generateCodeSnippet(
  method: string,
  path: string,
  framework: FrameworkLanguage,
  tag: string,
  pathParams: string[] = []
): string {
  const cleanMethod = method.toUpperCase();
  const pascalTag = tag.charAt(0).toUpperCase() + tag.slice(1);

  switch (framework) {
    case 'nestjs': {
      const nestMethod = cleanMethod.charAt(0) + cleanMethod.slice(1).toLowerCase();
      const paramsDecorators = pathParams
        .map((p) => `  @Param('${p}') ${p}: string,`)
        .join('\n');

      return `@ApiTags('${pascalTag}')
@Controller('${tag.toLowerCase()}')
export class ${pascalTag}Controller {
  @${nestMethod}('${path.replace(/^\/[^/]+/, '')}')
  @ApiOperation({ summary: '${cleanMethod} ${path}' })
  @ApiResponse({ status: 200, description: 'Success' })
  async handleRequest(
${paramsDecorators ? paramsDecorators + '\n' : ''}    @Body() body: any,
  ) {
    return {
      success: true,
      path: '${path}',
      method: '${cleanMethod}',
    };
  }
}`;
    }

    case 'express': {
      const paramYaml = pathParams
        .map(
          (p) => ` *       - in: path
 *         name: ${p}
 *         required: true
 *         schema:
 *           type: string`
        )
        .join('\n');

      return `/**
 * @openapi
 * ${path}:
 *   ${cleanMethod.toLowerCase()}:
 *     tags:
 *       - ${pascalTag}
 *     summary: ${cleanMethod} ${path}${paramYaml ? '\n *     parameters:\n' + paramYaml : ''}
 *     responses:
 *       200:
 *         description: Success response
 */
app.${cleanMethod.toLowerCase()}('${path.replace(/\{([a-zA-Z0-9_]+)\}/g, ':$1')}', (req, res) => {
  res.json({ success: true });
});`;
    }

    case 'fastapi': {
      const pyMethod = cleanMethod.toLowerCase();
      const pyParams = pathParams.map((p) => `${p}: str`).join(', ');

      return `@router.${pyMethod}("${path}", tags=["${pascalTag}"], summary="${cleanMethod} ${path}")
async function handle_${cleanMethod.toLowerCase()}_request(${pyParams}):
    """
    ${cleanMethod} ${path}
    Auto-generated FastAPI handler snippet by Proxync Studio.
    """
    return {"status": "ok", "message": "Success"}`;
    }

    case 'springboot': {
      const springMethod =
        cleanMethod === 'GET'
          ? 'GetMapping'
          : cleanMethod === 'POST'
          ? 'PostMapping'
          : cleanMethod === 'PUT'
          ? 'PutMapping'
          : cleanMethod === 'DELETE'
          ? 'DeleteMapping'
          : 'RequestMapping';

      const pathVars = pathParams
        .map((p) => `@PathVariable("${p}") String ${p}`)
        .join(', ');

      return `@RestController
@RequestMapping("/api/${tag.toLowerCase()}")
@Tag(name = "${pascalTag}", description = "Operations for ${pascalTag}")
public class ${pascalTag}Controller {

    @${springMethod}("${path}")
    @Operation(summary = "${cleanMethod} ${path}")
    @ApiResponse(responseCode = "200", description = "Successful Operation")
    public ResponseEntity<?> handleRequest(${pathVars}) {
        return ResponseEntity.ok(Map.of("status", "success"));
    }
}`;
    }

    case 'go': {
      return `// ${pascalTag}Handler handles ${cleanMethod} ${path}
// @Summary ${cleanMethod} ${path}
// @Tags ${pascalTag}
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router ${path} [${cleanMethod.toLowerCase()}]
func ${pascalTag}Handler(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "status": "success",
    })
}`;
    }

    default:
      return `// Codebase annotation snippet for ${cleanMethod} ${path}`;
  }
}
