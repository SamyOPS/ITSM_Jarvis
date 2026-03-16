import { GetHealthUseCase } from './get-health.use-case';

describe('GetHealthUseCase', () => {
  it('returns a healthy backend snapshot', () => {
    const useCase = new GetHealthUseCase();

    expect(useCase.execute()).toEqual({
      service: 'backend',
      status: 'ok',
    });
  });
});
